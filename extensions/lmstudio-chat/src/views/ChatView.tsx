import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  environment,
  getPreferenceValues,
  getSelectedFinderItems,
  showToast,
} from "@raycast/api";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import { useConversation } from "../hooks/useChat";
import { useLoadedModels } from "../hooks/useModels";
import { MAX_ATTACHMENTS_PER_MESSAGE, classifyPath } from "../lib/attachments";
import { isConnectionError } from "../lib/lmstudio";
import {
  answerText,
  hasAttachments,
  modelColor,
  shortModelName,
  splitIntoTurns,
  turnMarkdown,
} from "../lib/transcript";
import { Attachment } from "../lib/types";

interface Preferences {
  defaultModel?: string;
}

/**
 * Conversation Map view: the search bar IS the message input; the left column
 * lists each turn (newest first) with a model tag and a live dot while
 * streaming; the right pane shows the selected turn Quick AI style.
 * Attachments are added via Finder/clipboard actions into a pending draft
 * that ships with the next Enter.
 */
export function ChatView(props: { chatId?: string; initialPrompt?: string }) {
  const { chat, isStreaming, error, sendMessage, newChat } = useConversation(
    props.chatId,
  );
  const {
    models,
    isLoading: modelsLoading,
    error: modelsError,
    revalidate,
  } = useLoadedModels();
  const [searchText, setSearchText] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>(
    [],
  );
  const pendingRef = useRef<Attachment[]>([]);
  const initialSentRef = useRef(false);
  const imageCacheDir = join(environment.supportPath, "attachments");

  function updatePending(next: Attachment[]) {
    pendingRef.current = next;
    setPendingAttachments(next);
  }

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Chat request failed",
        message: error.message,
      });
    }
  }, [error]);

  const modelIds = (models ?? []).map((m) => m.id);
  const preferredModel =
    getPreferenceValues<Preferences>().defaultModel?.trim();
  const effectiveModel =
    selectedModel ||
    (chat?.model && modelIds.includes(chat.model) ? chat.model : undefined) ||
    (preferredModel && modelIds.includes(preferredModel)
      ? preferredModel
      : modelIds[0]) ||
    "";
  const effectiveVision =
    (models ?? []).find((m) => m.id === effectiveModel)?.vision ?? false;

  // Fire the launch-argument question once the model list arrives.
  useEffect(() => {
    if (
      props.initialPrompt?.trim() &&
      !initialSentRef.current &&
      effectiveModel &&
      !props.chatId
    ) {
      initialSentRef.current = true;
      sendMessage(props.initialPrompt, effectiveModel);
    }
  }, [effectiveModel, props.initialPrompt, props.chatId, sendMessage]);

  async function addAttachments(paths: string[]) {
    const problems: string[] = [];
    const accepted: Attachment[] = [];
    for (const path of paths) {
      const result = await classifyPath(path, { imageCacheDir });
      if (!result.ok) {
        problems.push(result.reason);
        continue;
      }
      if (result.attachment.type === "image" && !effectiveVision) {
        problems.push(`${result.attachment.name}: model has no vision support`);
        continue;
      }
      accepted.push(result.attachment);
    }
    // Merge synchronously so overlapping attach calls cannot lose additions.
    const merged = [...pendingRef.current];
    let added = 0;
    for (const attachment of accepted) {
      if (merged.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
        problems.push(`limit is ${MAX_ATTACHMENTS_PER_MESSAGE} per message`);
        break;
      }
      merged.push(attachment);
      added += 1;
    }
    updatePending(merged);
    if (problems.length > 0) {
      await showToast({
        style: added > 0 ? Toast.Style.Success : Toast.Style.Failure,
        title:
          added > 0
            ? `Attached ${added}, skipped ${problems.length}`
            : "Not attached",
        message: problems[0],
      });
    } else if (added > 0) {
      await showToast({
        style: Toast.Style.Success,
        title: `Attached ${added} file${added > 1 ? "s" : ""}`,
      });
    }
  }

  async function attachFromFinder() {
    try {
      const items = await getSelectedFinderItems();
      if (items.length === 0) throw new Error("empty");
      await addAttachments(items.map((i) => i.path));
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Finder selection",
        message: "Select file(s) in Finder first.",
      });
    }
  }

  async function attachFromClipboard() {
    const { file } = await Clipboard.read();
    if (!file) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file in clipboard",
        message: "Copy a file or take a screenshot to a file first.",
      });
      return;
    }
    const path = decodeURIComponent(file.replace(/^file:\/\//, ""));
    await addAttachments([path]);
  }

  async function handleSend() {
    if (!searchText.trim()) return;
    if (isStreaming) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Still answering",
        message: "Wait for the current answer to finish.",
      });
      return;
    }
    if (!effectiveModel) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No model available",
        message: "Load or download a model in LM Studio first.",
      });
      return;
    }
    if (
      pendingAttachments.some((a) => a.type === "image") &&
      !effectiveVision
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model has no vision support",
        message: "Pick a vision-capable model or clear image attachments.",
      });
      return;
    }
    const text = searchText;
    const attachments = pendingAttachments;
    setSearchText("");
    updatePending([]);
    await sendMessage(text, effectiveModel, {
      attachments,
      includeImages: effectiveVision,
    });
  }

  if (modelsError) {
    const connection = isConnectionError(modelsError);
    return (
      <List>
        <List.EmptyView
          icon={connection ? Icon.Plug : Icon.Warning}
          title={
            connection
              ? "LM Studio is not running"
              : "Failed to reach LM Studio"
          }
          description={
            connection
              ? "Open the LM Studio app or run `lms server start`, then retry."
              : modelsError.message
          }
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const sendAction = (
    <Action
      title={chat ? "Ask Follow-Up" : "Send Message"}
      icon={Icon.ArrowUp}
      onAction={handleSend}
    />
  );

  const attachActions = (
    <>
      <Action
        title="Attach Finder Selection"
        icon={Icon.Finder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        onAction={attachFromFinder}
      />
      <Action
        title="Attach from Clipboard"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["opt", "cmd"], key: "v" }}
        onAction={attachFromClipboard}
      />
      {pendingAttachments.length > 0 && (
        <Action
          title="Clear Attachments"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={() => updatePending([])}
        />
      )}
    </>
  );

  const noModels = models !== undefined && models.length === 0;
  const turns = chat ? splitIntoTurns(chat) : [];
  // Newest turn first; it is also the streaming one, so keep it selected.
  const reversed = [...turns].reverse();
  const streamingUserIndex =
    isStreaming && turns.length > 0 ? turns[turns.length - 1].userIndex : -1;
  const attachSuffix =
    pendingAttachments.length > 0 ? ` · 📎 ${pendingAttachments.length}` : "";
  const attachPrefix =
    pendingAttachments.length > 0 ? `📎 ${pendingAttachments.length} · ` : "";

  return (
    <List
      isLoading={isStreaming || modelsLoading}
      isShowingDetail={!!chat}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`${attachPrefix}${chat ? "Ask follow-up…" : "Ask anything…"}`}
      navigationTitle={`${chat ? `${chat.title} — ${chat.model}` : "New Chat"}${attachSuffix}`}
      selectedItemId={
        chat && turns.length > 0
          ? `turn-${turns[turns.length - 1].userIndex}`
          : undefined
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Model"
          value={effectiveModel}
          onChange={setSelectedModel}
        >
          {(models ?? []).map((m) => (
            <List.Dropdown.Item key={m.id} title={m.id} value={m.id} />
          ))}
        </List.Dropdown>
      }
    >
      {!chat ? (
        <List.EmptyView
          icon={noModels ? Icon.HardDrive : Icon.Message}
          title={noModels ? "No model available" : "Ask anything"}
          description={
            noModels
              ? "Download a model in the LM Studio app first."
              : "Type your question above and press Enter."
          }
          actions={
            <ActionPanel>
              {sendAction}
              {attachActions}
            </ActionPanel>
          }
        />
      ) : (
        reversed.map((turn) => {
          const isStreamingTurn = turn.userIndex === streamingUserIndex;
          const model = chat.model;
          return (
            <List.Item
              key={turn.userIndex}
              id={`turn-${turn.userIndex}`}
              icon={
                isStreamingTurn
                  ? { source: Icon.Dot, tintColor: Color.Green }
                  : Icon.Bubble
              }
              title={
                turn.question.content.replace(/\s+/g, " ").slice(0, 40) || "…"
              }
              accessories={[
                ...(hasAttachments(turn) ? [{ icon: Icon.Paperclip }] : []),
                {
                  tag: {
                    value: shortModelName(model),
                    color: modelColor(model),
                  },
                },
                {
                  date: new Date(
                    turn.answer?.timestamp ?? turn.question.timestamp,
                  ),
                },
              ]}
              detail={<List.Item.Detail markdown={turnMarkdown(turn, model)} />}
              actions={
                <ActionPanel>
                  {sendAction}
                  {attachActions}
                  <Action.CopyToClipboard
                    title="Copy Answer"
                    content={answerText(turn)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Answer to Active App"
                    content={answerText(turn)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  />
                  <Action
                    title="New Chat"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={newChat}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
