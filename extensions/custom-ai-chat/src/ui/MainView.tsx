import { Alert, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useLocalStorage, usePromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadModelCatalog, loadModelCatalogSync } from "../config/providers";
import { deleteModelFromProvidersYaml, resetProvidersConfig } from "../config/providers-writer";
import { isAbortError, streamChatCompletion, type ChatMessage } from "../lib/chat-completions";
import {
  createConversation,
  createMessage,
  findLastTurn,
  hasStreamingMessages,
  repairInterruptedMessages,
  sortConversations,
  titleFromPrompt,
  toChatMessages,
} from "../lib/conversation";
import { getErrorMessage } from "../lib/guards";
import { getPreview, renderConversation } from "../lib/format";
import { loadConversations, loadConversationsSync, saveConversations } from "../storage/conversations";
import type { CatalogResult, Conversation, MessageStatus, ModelRef } from "../types";
import { AddModelForm } from "./AddModelForm";
import { ChatActions } from "./ChatActions";
import { EditModelForm, type ModelLocator } from "./EditModelForm";
import { ModelDropdown } from "./ModelDropdown";
import { SetupView } from "./SetupView";

export interface LaunchInput {
  prompt: string;
  selectedText: string;
  ready: boolean;
}

export function MainView({ launchInput, draftValues }: { launchInput: LaunchInput; draftValues?: Form.Values }) {
  // Synchronous snapshot for the first paint; usePromise revalidates in the background.
  const [syncCatalog] = useState(() => loadModelCatalogSync());
  const { data: asyncCatalog, isLoading: isLoadingCatalog, revalidate } = usePromise(loadModelCatalog, []);
  const catalog: CatalogResult = asyncCatalog ?? syncCatalog;
  const models = catalog.status === "ready" ? catalog.models : [];

  // Saved choices via the official hook; keys match the previous LocalStorage keys.
  const {
    value: savedModelKey,
    setValue: setSavedModelKey,
    isLoading: isLoadingSavedModelKey,
  } = useLocalStorage<string | null>("byoai.selectedModelKey", null);
  const {
    value: savedConversationId,
    setValue: setSavedConversationId,
    isLoading: isLoadingSavedConversationId,
  } = useLocalStorage<string | null>("byoai.selectedConversationId", null);

  // Derive the active model: prefer the saved choice when still present, else the first model.
  const modelKey =
    savedModelKey && models.some((model) => model.key === savedModelKey) ? savedModelKey : (models[0]?.key ?? null);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const repaired = repairInterruptedMessages(loadConversationsSync());
      return repaired.length > 0 ? sortConversations(repaired) : [createConversation()];
    } catch {
      return [createConversation()];
    }
  });
  const [selectedId, setSelectedId] = useState(() => conversations[0]?.id ?? "");
  const [searchText, setSearchText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const loadFailedRef = useRef(false);
  const conversationsRef = useRef<Conversation[]>(conversations);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSentRef = useRef(false);
  // Capture the loaded saved id once so later switches don't re-run the load effect.
  const savedConversationIdRef = useRef(savedConversationId);
  savedConversationIdRef.current = savedConversationId;
  const navigation = useNavigation();

  const isModelReady =
    !isLoadingCatalog && !isLoadingSavedModelKey && !isLoadingConversations && models.length > 0 && modelKey !== null;

  const schedulePersist = useCallback(() => {
    if (loadFailedRef.current) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      if (loadFailedRef.current) {
        return;
      }
      const snapshot = conversationsRef.current;
      if (snapshot.length === 0) {
        return;
      }

      void saveConversations(snapshot).catch((error: unknown) => {
        void showFailureToast(error, { title: "Failed to save conversation" });
      });
    }, 200);
  }, []);

  const persistNow = useCallback(async () => {
    if (loadFailedRef.current) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const snapshot = conversationsRef.current;
    if (snapshot.length === 0) {
      return;
    }

    await saveConversations(snapshot);
  }, []);

  const startOver = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Reset Configuration?",
      message: "This replaces your providers.yaml with an empty config. Existing models and API keys will be removed.",
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    try {
      await resetProvidersConfig();
      await showToast({ style: Toast.Style.Success, title: "Configuration reset" });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to reset configuration" });
    }
  }, [revalidate]);

  useEffect(() => {
    if (isLoadingSavedConversationId) {
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const storedConversations = await loadConversations();
        const storedSelectedId = savedConversationIdRef.current;
        const hasRepairs = hasStreamingMessages(storedConversations);
        const repaired = hasRepairs ? repairInterruptedMessages(storedConversations) : storedConversations;
        const nextConversations = repaired.length > 0 ? sortConversations(repaired) : [createConversation()];
        const nextSelectedId =
          nextConversations.find((conversation) => conversation.id === storedSelectedId)?.id ?? nextConversations[0].id;

        if (!cancelled) {
          conversationsRef.current = nextConversations;
          setConversations(nextConversations);
          setSelectedId(nextSelectedId);
          if (hasRepairs) {
            void saveConversations(nextConversations).catch(() => undefined);
          }
        }
      } catch (error) {
        const fallback = [createConversation()];

        if (!cancelled) {
          loadFailedRef.current = true;
          conversationsRef.current = fallback;
          setConversations(fallback);
          setSelectedId(fallback[0].id);
          await showFailureToast(error, {
            title: "Failed to load conversation history",
            message: "Saving is paused to protect your existing files.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConversations(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      void persistNow().catch(() => undefined);
    };
  }, [persistNow, isLoadingSavedConversationId]);

  useEffect(() => {
    if (launchInput.ready && !launchInput.prompt && launchInput.selectedText) {
      setSearchText(launchInput.selectedText);
    }
  }, [launchInput]);

  const patchConversation = useCallback(
    (id: string, updater: (conversation: Conversation) => Conversation) => {
      const next = conversationsRef.current.map((conversation) =>
        conversation.id === id ? updater(conversation) : conversation,
      );
      conversationsRef.current = next;
      setConversations(next);
      schedulePersist();
    },
    [schedulePersist],
  );

  const promoteConversation = useCallback((id: string) => {
    const current = conversationsRef.current;
    const target = current.find((conversation) => conversation.id === id);
    if (!target) {
      return;
    }
    const next = [target, ...current.filter((conversation) => conversation.id !== id)];
    conversationsRef.current = next;
    setConversations(next);
  }, []);

  const appendToMessage = useCallback(
    (conversationId: string, messageId: string, delta: string) => {
      patchConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: conversation.messages.map((message) =>
          message.id === messageId ? { ...message, content: message.content + delta } : message,
        ),
      }));
    },
    [patchConversation],
  );

  const setMessageResult = useCallback(
    (conversationId: string, messageId: string, content: string | null, status: MessageStatus, tokens?: number) => {
      patchConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: conversation.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: content ?? message.content,
                status,
                tokens: tokens ?? message.tokens,
              }
            : message,
        ),
      }));
    },
    [patchConversation],
  );

  interface GenerationParams {
    conversationId: string;
    targetMessageId: string;
    model: ModelRef;
    requestMessages: ChatMessage[];
    successTitle: string;
  }

  const runGeneration = useCallback(
    async (params: GenerationParams) => {
      const { conversationId, targetMessageId, model, requestMessages, successTitle } = params;
      const controller = new AbortController();
      abortRef.current = controller;
      sendingRef.current = true;
      setIsSending(true);
      void showToast({
        style: Toast.Style.Animated,
        title: "Generating…",
        message: "Closing the window stops generation",
      });

      let received = "";
      let usedTokens: number | undefined;

      try {
        await persistNow();
        await streamChatCompletion({
          modelRef: model,
          messages: requestMessages,
          signal: controller.signal,
          onDelta: (delta) => {
            received += delta;
            appendToMessage(conversationId, targetMessageId, delta);
          },
          onUsage: (tokens) => {
            usedTokens = tokens;
          },
        });

        if (received.length === 0) {
          setMessageResult(conversationId, targetMessageId, "_The model returned no content._", "error", usedTokens);
          await showToast({ style: Toast.Style.Failure, title: "No content returned" });
          return;
        }

        setMessageResult(conversationId, targetMessageId, null, "done", usedTokens);
        await showToast({ style: Toast.Style.Success, title: successTitle });
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          setMessageResult(
            conversationId,
            targetMessageId,
            received.length === 0 ? "_Cancelled._" : null,
            "cancelled",
            usedTokens,
          );
          await showToast({ style: Toast.Style.Success, title: "Generation cancelled" });
          return;
        }

        const message = getErrorMessage(error);
        setMessageResult(
          conversationId,
          targetMessageId,
          received.length === 0 ? `> **Request failed**\n>\n> ${message}` : null,
          "error",
          usedTokens,
        );
        await showFailureToast(error, { title: "Failed to generate response", message });
      } finally {
        sendingRef.current = false;
        setIsSending(false);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }

        try {
          await persistNow();
        } catch (error) {
          await showFailureToast(error, { title: "Failed to save conversation" });
        }
      }
    },
    [appendToMessage, persistNow, setMessageResult],
  );

  const send = useCallback(
    async (conversation: Conversation, prompt: string) => {
      const text = prompt.trim();

      if (!text) {
        await showToast({ style: Toast.Style.Failure, title: "Enter a question first" });
        return;
      }

      if (loadFailedRef.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Conversation history could not be loaded",
          message: "Restart the extension before starting a new conversation.",
        });
        return;
      }
      if (sendingRef.current || isLoadingConversations) {
        await showToast({ style: Toast.Style.Animated, title: "A request is already in progress" });
        return;
      }
      if (!isModelReady) {
        await showToast({ style: Toast.Style.Animated, title: "Models are still loading" });
        return;
      }

      const model = models.find((candidate) => candidate.key === modelKey);
      if (!model) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No model available",
          message: "Add a model first",
        });
        return;
      }

      setSearchText("");

      const userMessage = createMessage("user", text);
      const assistantMessage = createMessage("assistant", "", model.modelName, "streaming");
      const requestMessages: ChatMessage[] = [
        ...toChatMessages(conversation.messages),
        { role: "user", content: text },
      ];

      patchConversation(conversation.id, (current) => ({
        ...current,
        title: current.messages.length === 0 ? titleFromPrompt(text) : current.title,
        updatedAt: Date.now(),
        messages: [...current.messages, userMessage, assistantMessage],
      }));
      promoteConversation(conversation.id);

      await runGeneration({
        conversationId: conversation.id,
        targetMessageId: assistantMessage.id,
        model,
        requestMessages,
        successTitle: "Response generated",
      });
    },
    [isLoadingConversations, isModelReady, modelKey, models, patchConversation, promoteConversation, runGeneration],
  );

  const cancel = useCallback(async () => {
    if (!abortRef.current) {
      await showToast({ style: Toast.Style.Failure, title: "No request in progress" });
      return;
    }

    abortRef.current.abort();
  }, []);

  const newConversation = useCallback(async () => {
    if (isSending) {
      await showToast({ style: Toast.Style.Animated, title: "Please wait for the current generation to finish" });
      return;
    }

    const existingEmpty = conversationsRef.current.find((conversation) => conversation.messages.length === 0);
    if (existingEmpty) {
      setSelectedId(existingEmpty.id);
      void setSavedConversationId(existingEmpty.id);
      setSearchText("");
      await showToast({ style: Toast.Style.Success, title: "Conversation created" });
      return;
    }

    const created = createConversation();
    const next = [created, ...conversationsRef.current];
    conversationsRef.current = next;
    setConversations(next);
    setSelectedId(created.id);
    void setSavedConversationId(created.id);
    setSearchText("");
    await showToast({ style: Toast.Style.Success, title: "Conversation created" });

    try {
      await persistNow();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to save conversation" });
    }
  }, [isSending, persistNow]);

  const deleteConversation = useCallback(
    async (conversation: Conversation) => {
      if (isSending) {
        await showToast({ style: Toast.Style.Animated, title: "Please wait for the current generation to finish" });
        return;
      }

      const current = conversationsRef.current;
      const index = current.findIndex((candidate) => candidate.id === conversation.id);
      if (index < 0) {
        return;
      }

      const confirmed = await confirmAlert({
        title: "Delete this conversation?",
        message: conversation.title
          ? `"${conversation.title}" and all its messages will be permanently deleted. This cannot be undone.`
          : "This conversation and all its messages will be permanently deleted. This cannot be undone.",
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });
      if (!confirmed) {
        return;
      }

      let next = current.filter((candidate) => candidate.id !== conversation.id);
      if (next.length === 0) {
        next = [createConversation()];
      }

      let nextSelectedId = selectedId;
      if (selectedId === conversation.id) {
        const neighbour = current[index + 1] ?? current[index - 1] ?? next[0];
        nextSelectedId = next.find((candidate) => candidate.id === neighbour.id)?.id ?? next[0].id;
      }

      conversationsRef.current = next;
      setConversations(next);
      setSelectedId(nextSelectedId);
      void setSavedConversationId(nextSelectedId);
      setSearchText("");

      try {
        await persistNow();
        await showToast({ style: Toast.Style.Success, title: "Conversation deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to save conversation" });
      }
    },
    [isSending, persistNow, selectedId],
  );

  const regenerate = useCallback(
    async (conversation: Conversation) => {
      if (loadFailedRef.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Conversation history could not be loaded",
          message: "Restart the extension before starting a new conversation.",
        });
        return;
      }
      if (sendingRef.current || isLoadingConversations) {
        await showToast({ style: Toast.Style.Animated, title: "A request is already in progress" });
        return;
      }
      if (!isModelReady) {
        await showToast({ style: Toast.Style.Animated, title: "Models are still loading" });
        return;
      }

      const model = models.find((candidate) => candidate.key === modelKey);
      if (!model) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No model available",
          message: "Add a model first",
        });
        return;
      }

      const turn = findLastTurn(conversation.messages);
      if (!turn) {
        await showToast({ style: Toast.Style.Failure, title: "No response to regenerate" });
        return;
      }

      const prompt = conversation.messages[turn.userIndex].content.trim();
      const target = conversation.messages[turn.assistantIndex];
      const previousMessages = conversation.messages.slice(0, turn.userIndex);
      const requestMessages: ChatMessage[] = [...toChatMessages(previousMessages), { role: "user", content: prompt }];

      patchConversation(conversation.id, (current) => ({
        ...current,
        updatedAt: Date.now(),
        messages: current.messages.map((message) =>
          message.id === target.id
            ? { ...message, content: "", tokens: undefined, modelName: model.modelName, status: "streaming" as const }
            : message,
        ),
      }));
      promoteConversation(conversation.id);

      await runGeneration({
        conversationId: conversation.id,
        targetMessageId: target.id,
        model,
        requestMessages,
        successTitle: "Response regenerated",
      });
    },
    [isLoadingConversations, isModelReady, modelKey, models, patchConversation, promoteConversation, runGeneration],
  );

  const handleModelChange = useCallback(
    (value: string) => {
      void setSavedModelKey(value);
    },
    [setSavedModelKey],
  );

  const handleSelectionChange = useCallback(
    (id: string) => {
      setSelectedId(id);
      void setSavedConversationId(id);
    },
    [setSavedConversationId],
  );

  const openAddModel = useCallback(() => {
    navigation.push(<AddModelForm onSaved={() => void revalidate()} navigationTitle="Add Model" />);
  }, [revalidate, navigation]);

  const handleModelUpdated = useCallback(
    async (locator: ModelLocator) => {
      const refreshed = await loadModelCatalog();
      if (refreshed.status !== "ready") {
        return;
      }

      const newKey =
        refreshed.models.find((model) => model.providerId === locator.providerId && model.modelId === locator.modelId)
          ?.key ?? null;
      if (newKey) {
        await setSavedModelKey(newKey);
      }
      revalidate();
    },
    [revalidate, setSavedModelKey],
  );

  const deleteModel = useCallback(async (): Promise<boolean> => {
    if (isSending) {
      void showToast({ style: Toast.Style.Animated, title: "Please wait for the current generation to finish" });
      return false;
    }

    const current = models.find((model) => model.key === modelKey);
    if (!current) {
      void showToast({ style: Toast.Style.Failure, title: "No model selected" });
      return false;
    }

    const confirmed = await confirmAlert({
      title: "Delete this model?",
      message: `"${current.providerName} · ${current.modelName}" will be removed from providers.yaml. This cannot be undone.`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
    if (!confirmed) {
      return false;
    }

    try {
      await deleteModelFromProvidersYaml({
        providerId: current.providerId,
        modelId: current.modelId,
      });

      const refreshed = await loadModelCatalog();
      const nextModels = refreshed.status === "ready" ? refreshed.models : [];

      const stillExists = modelKey && nextModels.some((model) => model.key === modelKey);
      if (!stillExists) {
        const removedIndex = models.findIndex((model) => model.key === modelKey);
        const nextKey = nextModels[Math.min(removedIndex, nextModels.length - 1)]?.key ?? null;
        await setSavedModelKey(nextKey);
      }
      revalidate();

      await showToast({ style: Toast.Style.Success, title: "Model deleted" });
      return true;
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete model" });
      return false;
    }
  }, [isSending, modelKey, models, revalidate, setSavedModelKey]);

  const openEditModel = useCallback(() => {
    if (isSending) {
      void showToast({ style: Toast.Style.Animated, title: "Please wait for the current generation to finish" });
      return;
    }

    const current = models.find((model) => model.key === modelKey);
    if (!current) {
      void showToast({ style: Toast.Style.Failure, title: "No model selected" });
      return;
    }

    navigation.push(<EditModelForm model={current} onSaved={handleModelUpdated} onDelete={deleteModel} />);
  }, [deleteModel, handleModelUpdated, isSending, modelKey, models, navigation]);

  useEffect(() => {
    if (autoSentRef.current || draftValues) {
      return;
    }
    if (!launchInput.ready || !launchInput.prompt || !isModelReady) {
      return;
    }

    const freshConversation = createConversation();
    const nextConversations = [freshConversation, ...conversationsRef.current];
    conversationsRef.current = nextConversations;
    setConversations(nextConversations);
    setSelectedId(freshConversation.id);
    void setSavedConversationId(freshConversation.id);

    const prompt = launchInput.selectedText
      ? `${launchInput.prompt}\n\n${launchInput.selectedText}`
      : launchInput.prompt;

    autoSentRef.current = true;
    void send(freshConversation, prompt);
  }, [draftValues, isModelReady, launchInput, send]);

  if (draftValues && !draftDismissed) {
    return (
      <AddModelForm
        onSaved={() => void revalidate()}
        onDone={() => setDraftDismissed(true)}
        initialValues={draftValues}
        enableDrafts
      />
    );
  }

  if (catalog.status === "missing" || catalog.status === "empty") {
    return <AddModelForm onSaved={() => void revalidate()} onDone={() => undefined} enableDrafts />;
  }

  if (catalog.status !== "ready" || models.length === 0) {
    return <SetupView catalog={catalog} onRetry={() => void revalidate()} onStartOver={() => void startOver()} />;
  }

  return (
    <List
      isShowingDetail
      isLoading={isLoadingConversations}
      filtering={false}
      searchBarPlaceholder="type question · ↑↓ choose · ↵ send"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<ModelDropdown models={models} value={modelKey} onChange={handleModelChange} />}
      selectedItemId={selectedId}
      onSelectionChange={(id) => {
        if (id) {
          handleSelectionChange(id);
        }
      }}
    >
      {conversations.map((conversation) => (
        <List.Item
          key={conversation.id}
          id={conversation.id}
          icon={Icon.SpeechBubble}
          title={conversation.title}
          subtitle={getPreview(conversation)}
          detail={<List.Item.Detail markdown={renderConversation(conversation)} />}
          actions={
            <ChatActions
              conversation={conversation}
              searchText={searchText}
              isSending={isSending}
              onSend={send}
              onCancel={cancel}
              onRegenerate={regenerate}
              onNewConversation={newConversation}
              onDeleteConversation={deleteConversation}
              onAddModel={openAddModel}
              onEditModel={openEditModel}
            />
          }
        />
      ))}
      <List.EmptyView
        title="No conversations yet"
        description="Type a question to get started"
        icon={Icon.SpeechBubble}
      />
    </List>
  );
}
