import { Clipboard, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatVisionError } from "./analyze-image";
import { ReplyForm, SessionModelForm } from "./chat-forms";
import { type ChatTurn, continueConversation, type SessionContext } from "./continue-chat";
import { parseModelPreference } from "./model";
import { regenerateLastTurn } from "./regenerate-turn";
import {
  chatToMarkdown,
  deleteStoredSession,
  loadStoredSessions,
  readSessionImageFile,
  type StoredSession,
} from "./stored-sessions";
import { exportChatConversationToFile } from "./export-chat";
import { formatUsageHint, pushUsageLedger, sumTokenUsages, type TokenUsage } from "./token-usage";
import { EXTENSION_DISPLAY_NAME } from "./extension-brand";
import { ChatThreadList } from "./ui/chat-thread-list";
import { HistorySessionsList } from "./ui/history-session-list";

export default function SessionHistoryCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const { push, pop } = useNavigation();
  const showTokenUsagePref = prefs.showTokenUsage === true;
  const showEstimatedCostPref = showTokenUsagePref && prefs.showEstimatedCost === true;

  const [phase, setPhase] = useState<"list" | "chat">("list");
  const [historySessions, setHistorySessions] = useState<StoredSession[]>([]);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [session, setSession] = useState<SessionContext | null>(null);
  const [sessionModel, setSessionModel] = useState("");
  const [lastRequestUsage, setLastRequestUsage] = useState<TokenUsage | null>(null);
  const [usageLedger, setUsageLedger] = useState<TokenUsage[]>([]);

  const effectiveSessionModel = sessionModel.trim() || prefs.model?.trim() || "openai:gpt-4o-mini";
  const usageHintOpts = useMemo(
    () => ({ modelValue: effectiveSessionModel, showEstimatedCost: showEstimatedCostPref }),
    [effectiveSessionModel, showEstimatedCostPref],
  );
  const sessionUsageTotal = useMemo(() => sumTokenUsages(usageLedger), [usageLedger]);

  useEffect(() => {
    void loadStoredSessions().then(setHistorySessions);
  }, []);

  const refreshList = useCallback(async () => {
    setHistorySessions(await loadStoredSessions());
  }, []);

  const backToList = useCallback(() => {
    setPhase("list");
    setMessages([]);
    setSession(null);
    setSessionModel("");
    setLastRequestUsage(null);
    setUsageLedger([]);
    void refreshList();
  }, [refreshList]);

  const sendFollowUp = useCallback(
    async (followUpRaw: string) => {
      const followUp = followUpRaw.trim();
      if (!followUp || !session) {
        return;
      }

      const parsed = parseModelPreference(effectiveSessionModel);
      const thread: ChatTurn[] = [...messages, { role: "user", content: followUp }];

      const loading = await showToast({
        style: Toast.Style.Animated,
        title: "Waiting for reply…",
      });

      try {
        const { text: reply, usage } = await continueConversation(prefs, parsed, session, thread);
        setMessages([...thread, { role: "assistant", content: reply }]);
        setLastRequestUsage(usage ?? null);
        setUsageLedger((prev) => pushUsageLedger(prev, usage, false));
        await Clipboard.copy(reply);
        loading.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "Reply ready",
          message: `Copied to clipboard.${formatUsageHint(usage, showTokenUsagePref, usageHintOpts)}`,
        });
      } catch (err) {
        loading.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Message failed",
          message: formatVisionError(err),
        });
      }
    },
    [messages, prefs, session, showTokenUsagePref, usageHintOpts, effectiveSessionModel],
  );

  const runRegenerate = useCallback(async () => {
    if (!session || messages.length < 2) {
      return;
    }
    const loading = await showToast({
      style: Toast.Style.Animated,
      title: "Regenerating…",
    });
    try {
      const { messages: next, usage } = await regenerateLastTurn(prefs, effectiveSessionModel, messages, session);
      setMessages(next);
      setLastRequestUsage(usage);
      setUsageLedger((prev) => pushUsageLedger(prev, usage, true));
      const last = [...next].reverse().find((m) => m.role === "assistant");
      if (last) {
        await Clipboard.copy(last.content);
      }
      loading.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Regenerated",
        message: `Copied to clipboard.${formatUsageHint(usage ?? undefined, showTokenUsagePref, usageHintOpts)}`,
      });
    } catch (err) {
      loading.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Regenerate failed",
        message: formatVisionError(err),
      });
    }
  }, [messages, prefs, session, showTokenUsagePref, usageHintOpts, effectiveSessionModel]);

  const openSessionModelPicker = useCallback(() => {
    push(
      <SessionModelForm
        initialModel={effectiveSessionModel}
        onSubmit={(model) => {
          pop();
          setSessionModel(model.trim());
          void showToast({ style: Toast.Style.Success, title: "Model updated for this chat" });
        }}
      />,
    );
  }, [effectiveSessionModel, pop, push]);

  const openReply = useCallback(() => {
    push(
      <ReplyForm
        onSubmit={(text) => {
          pop();
          void sendFollowUp(text);
        }}
      />,
    );
  }, [pop, push, sendFollowUp]);

  const copyConversationMarkdown = useCallback(async () => {
    await Clipboard.copy(chatToMarkdown(messages));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: "Full conversation as Markdown.",
    });
  }, [messages]);

  const exportConversationToFile = useCallback(async () => {
    try {
      exportChatConversationToFile(messages, effectiveSessionModel, sessionUsageTotal);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported",
        message: "Markdown saved; Finder opened to the file.",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [messages, effectiveSessionModel, sessionUsageTotal]);

  const restoreFromHistory = useCallback(
    (record: StoredSession) => {
      setLastRequestUsage(null);
      setUsageLedger([]);
      setSessionModel(prefs.model?.trim() || "openai:gpt-4o-mini");
      if (record.source === "browser") {
        setMessages(record.messages);
        setSession({ source: "browser" });
        setPhase("chat");
        return;
      }
      const img = readSessionImageFile(record);
      if (!img) {
        void showToast({
          style: Toast.Style.Failure,
          title: "Image missing",
          message: "The saved screen image could not be loaded.",
        });
        return;
      }
      setMessages(record.messages);
      setSession({
        source: "screen",
        screenBase64: img.base64,
        screenMediaType: img.mediaType,
      });
      setPhase("chat");
    },
    [prefs.model],
  );

  const handleDeleteHistory = useCallback(
    async (id: string) => {
      await deleteStoredSession(id);
      await refreshList();
    },
    [refreshList],
  );

  if (phase === "chat" && messages.length > 0 && session) {
    return (
      <ChatThreadList
        navigationTitle={`${EXTENSION_DISPLAY_NAME} · Session`}
        messages={messages}
        effectiveSessionModel={effectiveSessionModel}
        lastRequestUsage={lastRequestUsage}
        sessionUsageTotal={sessionUsageTotal}
        usageCallCount={usageLedger.length}
        showTokenUsage={showTokenUsagePref}
        showEstimatedCost={showEstimatedCostPref}
        openReply={openReply}
        copyConversationMarkdown={copyConversationMarkdown}
        exportConversationToFile={exportConversationToFile}
        runRegenerate={runRegenerate}
        openSessionModelPicker={openSessionModelPicker}
        backToHistory={backToList}
      />
    );
  }

  return (
    <HistorySessionsList sessions={historySessions} onRestore={restoreFromHistory} onDelete={handleDeleteHistory} />
  );
}
