import { copyError } from "../lib/copy-error";
import { logger } from "@chrismessina/raycast-logger";
import { showFailureToast } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { type ChatMessage, ServerDownError, streamChat } from "../lib/osaurus";
import { showServerDownToast } from "../lib/server-toast";

export interface Turn {
  id: string;
  question: string;
  model: string;
  reasoning: string;
  answer: string;
  status: "streaming" | "done" | "stopped" | "error";
  error?: string;
  startedAt: number;
  // Time from asking to the first answer token: how long a thinking model thought.
  thoughtMs?: number;
  durationMs?: number;
}

// One conversation, newest turn first. Nothing is persisted: Osaurus already records every
// /v1/chat/completions call in its own history, which Search History reads.
export function useChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const active = useRef<AbortController | null>(null);
  // One Osaurus session per conversation, so its chat history shows one chat, not one per question.
  const sessionId = useRef<string>(null);
  sessionId.current ??= randomUUID();

  // Leaving the command stops generation instead of letting Osaurus think on in the background.
  useEffect(() => () => active.current?.abort(), []);

  function ask(question: string, model: string) {
    // Osaurus replaces a session's stored turns with each request's messages. A stopped, failed or
    // superseded turn isn't sent as history, so reusing the session would erase it from Osaurus's
    // chat history; start a new session instead, which keeps the old one intact.
    const latest = turnsRef.current[0];
    if (latest && latest.status !== "done") sessionId.current = randomUUID();
    // A new question supersedes one still streaming.
    active.current?.abort();
    const abort = new AbortController();
    active.current = abort;

    const turn: Turn = {
      id: randomUUID(),
      question,
      model,
      reasoning: "",
      answer: "",
      status: "streaming",
      startedAt: performance.now(),
    };
    // Earlier finished turns are the conversation's context, oldest first.
    const history: ChatMessage[] = [...turnsRef.current]
      .reverse()
      .filter((t) => t.status === "done" && t.answer)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer },
      ]);
    logger.log("Ask", { model, historyTurns: history.length / 2 });
    setTurns((prev) => [turn, ...prev]);
    setSelectedId(turn.id);

    const update = (patch: Partial<Turn>) =>
      setTurns((prev) => prev.map((t) => (t.id === turn.id ? { ...t, ...patch } : t)));
    const buffered = { reasoning: "", answer: "" };
    let firstAnswerAt: number | undefined;
    let dirty = false;
    // Flush every 50 ms, and only when tokens arrived; an unconditional setState trips Raycast's render-loop warning.
    const timer = setInterval(() => {
      if (!dirty) return;
      dirty = false;
      update({ ...buffered });
    }, 50);
    const timing = () => ({
      thoughtMs: buffered.reasoning && firstAnswerAt ? firstAnswerAt - turn.startedAt : undefined,
      durationMs: performance.now() - turn.startedAt,
    });

    streamChat(
      model,
      [...history, { role: "user", content: question }],
      (delta, kind) => {
        if (kind === "content") {
          firstAnswerAt ??= performance.now();
          buffered.answer += delta;
        } else {
          buffered.reasoning += delta;
        }
        dirty = true;
      },
      abort.signal,
      sessionId.current ?? undefined,
    )
      .then(() => update({ ...buffered, ...timing(), status: "done" }))
      .catch((error: Error) => {
        if (abort.signal.aborted) return update({ ...buffered, ...timing(), status: "stopped" });
        logger.error("Ask failed", error);
        update({ ...buffered, ...timing(), status: "error", error: error.message });
        if (error instanceof ServerDownError) void showServerDownToast();
        else void showFailureToast(error, { title: "Couldn't get an answer", primaryAction: copyError(error) });
      })
      .finally(() => {
        clearInterval(timer);
        if (active.current === abort) active.current = null;
      });
  }

  function stop() {
    logger.log("Stop Answering pressed");
    active.current?.abort();
  }

  function clear() {
    active.current?.abort();
    sessionId.current = randomUUID();
    setTurns([]);
    setSelectedId(null);
  }

  return {
    turns,
    selectedId,
    setSelectedId,
    isStreaming: turns.some((t) => t.status === "streaming"),
    ask,
    stop,
    clear,
  };
}
