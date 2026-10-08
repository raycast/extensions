import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Chat } from "./chats";
import { FmError } from "./errors";
import { countTokens, MAX_PROMPT_TOKENS, respond, RunOptions } from "./fm";
import { fitHistory } from "./history";
import { buildTranscript, ChatMessage } from "./transcript";

export interface TurnResult {
  answer: string;
  /** Tokens of the request that was sent (history, instructions and the new message). */
  promptTokens: number;
  /** Older messages that were left out so the request fits the context window. */
  droppedMessages: number;
}

/**
 * Sends one chat message. The chat history is written to a temporary transcript that `fm respond --resume`
 * reads, trimmed so it fits the context window. The temporary file is removed afterwards.
 */
export async function sendChatMessage(
  chat: Pick<Chat, "id" | "instructions" | "messages">,
  prompt: string,
  workDirectory: string,
  runOptions: RunOptions = {},
): Promise<TurnResult> {
  await mkdir(workDirectory, { recursive: true });
  const transcriptPath = join(workDirectory, `${chat.id}-${randomUUID()}.json`);

  const writeTranscript = (history: ChatMessage[]) =>
    writeFile(transcriptPath, JSON.stringify(buildTranscript(chat.instructions, history)), "utf8");

  try {
    const fitted = await fitHistory(
      chat.messages,
      MAX_PROMPT_TOKENS,
      async (history) => {
        await writeTranscript(history);
        return countTokens(prompt, { transcriptPath, signal: runOptions.signal });
      },
      runOptions.signal,
    );
    if (fitted.tokens > MAX_PROMPT_TOKENS) {
      throw new FmError(
        "too-long",
        `This message is too long for the on-device model (${fitted.tokens.toLocaleString()} tokens, the limit is about ${MAX_PROMPT_TOKENS.toLocaleString()}). Send a shorter message.`,
      );
    }
    await writeTranscript(fitted.history);
    const answer = await respond({ prompt, transcriptPath }, runOptions);
    return { answer, promptTokens: fitted.tokens, droppedMessages: fitted.droppedMessages };
  } finally {
    await rm(transcriptPath, { force: true });
  }
}
