import { LocalStorage } from "@raycast/api";
import {
  exportThread,
  finishedReply,
  latestPuckConversation,
  newPuckConversation,
  sendMessage,
  textOf,
  watchLiveThreads,
  type ExportedThread,
} from "./amp";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves when the thread stops working, or after `fallbackMs` if `amp top` never shows it working. */
function settled(id: string, fallbackMs: number): Promise<void> {
  return new Promise((resolve) => {
    let sawWorking = false;
    const done = () => {
      clearTimeout(fallback);
      stop();
      resolve();
    };
    const fallback = setTimeout(done, fallbackMs);
    const stop = watchLiveThreads(
      (threads) => {
        const thread = threads.find((t) => t.id === id);
        if (thread?.working) sawWorking = true;
        else if (thread && sawWorking) done();
      },
      () => setTimeout(done, 3_000),
    );
  });
}

async function exportWithRetry(id: string): Promise<ExportedThread> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await exportThread(id);
    } catch (error) {
      // Amp limits full thread reads per minute.
      if (attempt >= 6 || !/too many/i.test(String(error))) throw error;
      await sleep(10_000);
    }
  }
}

/** Sends a message to a Puck conversation and waits for Puck's reply to it. */
export async function askPuck(conversationID: string, message: string, timeoutMs = 5 * 60_000): Promise<string> {
  await sendMessage(conversationID, message);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await settled(conversationID, 15_000);
    const thread = await exportWithRetry(conversationID);
    // Only accept a reply that comes after the message we just sent.
    const asked = thread.messages.findLastIndex((m) => m.role === "user" && textOf(m).trim() === message.trim());
    const reply = asked >= 0 && asked < thread.messages.length - 1 ? finishedReply(thread) : undefined;
    if (reply !== undefined) return reply;
  }
  throw new Error("Puck is still working. Open the conversation to follow along.");
}

export type ChatTurn = { role: "user" | "puck"; text: string };

export function chatTurns(thread: ExportedThread): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of thread.messages) {
    const text = textOf(m).trim();
    if (!text || m.role === "info") continue;
    if (m.role === "user") turns.push({ role: "user", text });
    // Puck narrates between tool calls; keep only the last text of each reply.
    else if (turns[turns.length - 1]?.role === "puck") turns[turns.length - 1].text = text;
    else turns.push({ role: "puck", text });
  }
  return turns;
}

const KEY = "puck-conversation";

/** The conversation Raycast talks to: the one picked last in Raycast, else your latest Puck conversation. */
export async function currentConversation(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(KEY);
  if (stored) return stored;
  const id = (await latestPuckConversation()) ?? (await newPuckConversation());
  await LocalStorage.setItem(KEY, id);
  return id;
}

export async function startConversation(): Promise<string> {
  const id = await newPuckConversation();
  await LocalStorage.setItem(KEY, id);
  return id;
}
