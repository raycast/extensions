import {
  Action,
  ActionPanel,
  Alert,
  LaunchProps,
  List,
  LocalStorage,
  confirmAlert,
  getPreferenceValues,
  open,
  popToRoot,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeAddress, pickQuery, sendToAgent } from "./lib";
import { MessagesPermissionError, incomingMessagesAfter, latestIncomingRowId } from "./messages";

type Prefs = {
  agentName: string;
  agentNumber: string;
  alwaysConfirm: boolean;
};

type Phase = "checking" | "sending" | "waiting" | "received" | "uncertain" | "permission" | "cancelled" | "error";

type ThreadMessage = {
  id: string;
  author: "you" | "agent";
  text: string;
};

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]{}()#+\-.!|>]/g, "\\$&");
}

function block(title: string, text: string): string {
  return `### ${title}\n\n${escapeMarkdown(text)}`;
}

export default function Command(props: LaunchProps<{ arguments: { question?: string } }>) {
  const prefs = getPreferenceValues<Prefs>();
  const initialQuestion = pickQuery(props.arguments?.question, props.fallbackText);
  const address = normalizeAddress(prefs.agentNumber);
  const [phase, setPhase] = useState<Phase>("checking");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [waitingDots, setWaitingDots] = useState(1);
  const replyReceivedSinceSend = useRef(false);
  const rootClearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (rootClearTimer.current) clearTimeout(rootClearTimer.current);

    return () => {
      // Deferring lets React's development effect replay cancel this cleanup.
      // A real navigation away has no matching setup, so the root query clears.
      rootClearTimer.current = setTimeout(() => {
        void popToRoot({ clearSearchBar: true });
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (phase !== "waiting") {
      setWaitingDots(1);
      return;
    }

    const timer = setInterval(() => setWaitingDots((current) => (current % 3) + 1), 450);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    let stopped = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    async function start() {
      if (!address) {
        setError(`Invalid agent address in preferences: ${prefs.agentNumber}`);
        setPhase("error");
        return;
      }
      const recipient = address;

      setError("");
      setMessages(initialQuestion ? [{ id: "initial", author: "you", text: initialQuestion }] : []);
      setPhase("checking");

      let cursor: number;
      try {
        cursor = await latestIncomingRowId(recipient);
      } catch (cause) {
        if (stopped) return;
        if (cause instanceof MessagesPermissionError) {
          setPhase("permission");
        } else {
          setError(cause instanceof Error ? cause.message : String(cause));
          setPhase("error");
        }
        return;
      }
      if (stopped) return;

      const key = `confirmed:${recipient}`;

      async function poll() {
        if (stopped) return;
        try {
          const incoming = await incomingMessagesAfter(recipient, cursor);
          if (incoming.length) {
            replyReceivedSinceSend.current = true;
            cursor = incoming[incoming.length - 1].rowId;
            setMessages((current) => [
              ...current,
              ...incoming.map((reply) => ({
                id: `incoming-${reply.rowId}`,
                author: "agent" as const,
                text: reply.text,
              })),
            ]);
            setPhase("received");
            await LocalStorage.setItem(key, "yes");
          }
        } catch (cause) {
          if (!stopped) {
            setError(cause instanceof Error ? cause.message : String(cause));
            setPhase(cause instanceof MessagesPermissionError ? "permission" : "error");
          }
          return;
        }
        pollTimer = setTimeout(poll, 1_000);
      }

      pollTimer = setTimeout(poll, 250);
      if (!initialQuestion) {
        setPhase("received");
        return;
      }

      const known = (await LocalStorage.getItem<string>(key)) === "yes";
      if (stopped) return;
      if (prefs.alwaysConfirm || !known) {
        const ok = await confirmAlert({
          title: `Send to ${prefs.agentName} (${recipient})?`,
          message: initialQuestion.length > 200 ? `${initialQuestion.slice(0, 200)}...` : initialQuestion,
          primaryAction: { title: "Send", style: Alert.ActionStyle.Default },
        });
        if (stopped) return;
        if (!ok) {
          setPhase("cancelled");
          return;
        }
      }

      replyReceivedSinceSend.current = false;
      setPhase("sending");
      void sendToAgent((script, args) => runAppleScript(script, args), recipient, initialQuestion)
        .then(async () => {
          await LocalStorage.setItem(key, "yes");
          if (!stopped && !replyReceivedSinceSend.current) setPhase("waiting");
        })
        .catch((cause) => {
          if (stopped || replyReceivedSinceSend.current) return;
          setError(
            `Messages did not confirm the send, but Raycast is still watching for a reply. Check Messages before retrying. ${
              cause instanceof Error ? cause.message.slice(0, 100) : ""
            }`,
          );
          setPhase("uncertain");
        });
    }

    void start();
    return () => {
      stopped = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [address, attempt, initialQuestion, prefs.agentName, prefs.agentNumber, prefs.alwaysConfirm]);

  const isBusy = ["checking", "sending", "waiting"].includes(phase);

  async function sendFollowUp() {
    const text = draft.trim();
    if (!text || !address || isBusy) return;

    const key = `confirmed:${address}`;
    const known = (await LocalStorage.getItem<string>(key)) === "yes";
    if (prefs.alwaysConfirm || !known) {
      const ok = await confirmAlert({
        title: `Send to ${prefs.agentName} (${address})?`,
        message: text.length > 200 ? `${text.slice(0, 200)}...` : text,
        primaryAction: { title: "Send", style: Alert.ActionStyle.Default },
      });
      if (!ok) return;
    }

    setDraft("");
    setError("");
    setMessages((current) => [...current, { id: `outgoing-${Date.now()}`, author: "you", text }]);
    replyReceivedSinceSend.current = false;
    setPhase("sending");

    try {
      await sendToAgent((script, args) => runAppleScript(script, args), address, text);
      await LocalStorage.setItem(key, "yes");
      if (!replyReceivedSinceSend.current) setPhase("waiting");
    } catch (cause) {
      if (replyReceivedSinceSend.current) return;
      setError(
        `Messages did not confirm the send, but Raycast is still watching for a reply. Check Messages before retrying. ${
          cause instanceof Error ? cause.message.slice(0, 100) : ""
        }`,
      );
      setPhase("uncertain");
    }
  }

  const markdown = useMemo(() => {
    const parts = messages.map((message) => block(message.author === "you" ? "You" : prefs.agentName, message.text));

    if (phase === "permission") {
      parts.push(
        "### Full Disk Access needed\n\nTo show replies here, allow **Raycast** in **System Settings → Privacy & Security → Full Disk Access**, then choose **Try Again** below. The extension only queries incoming messages from the configured Instinct address.",
      );
    } else if (phase === "cancelled") {
      parts.push("_Send cancelled._");
    } else if (phase === "error" || phase === "uncertain") {
      parts.push(block("Couldn’t continue", error));
    } else if (phase === "checking") {
      parts.push("_Preparing the thread…_");
    } else if (phase === "sending") {
      parts.push(`_Sending to ${escapeMarkdown(prefs.agentName)}…_`);
    } else if (phase === "waiting") {
      parts.push(`_${escapeMarkdown(prefs.agentName)} is thinking${".".repeat(waitingDots)}_`);
    } else if (!parts.length) {
      parts.push(`_Ask ${escapeMarkdown(prefs.agentName)} anything._`);
    }

    return parts.join("\n\n---\n\n");
  }, [error, messages, phase, prefs.agentName, waitingDots]);

  const latestReply = [...messages].reverse().find((message) => message.author === "agent");

  return (
    <List
      navigationTitle={`Ask ${prefs.agentName}`}
      filtering={false}
      searchText={draft}
      onSearchTextChange={setDraft}
      searchBarPlaceholder={`Follow up with ${prefs.agentName}…`}
      isShowingDetail
      isLoading={phase === "checking" || phase === "sending"}
    >
      <List.Item
        id="thread"
        title={prefs.agentName}
        icon="instinct-rounded.png"
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            <Action title={isBusy ? `Waiting for ${prefs.agentName}` : "Send Follow-Up"} onAction={sendFollowUp} />
            {latestReply && <Action.CopyToClipboard title="Copy Latest Reply" content={latestReply.text} />}
            {(phase === "permission" || phase === "error" || phase === "cancelled") && (
              <Action title="Try Again" onAction={() => setAttempt((value) => value + 1)} />
            )}
            {address && <Action title="Open Messages" onAction={() => open(`sms:${address}`)} />}
          </ActionPanel>
        }
      />
    </List>
  );
}
