import type { Chat, Message } from "../type";

/**
 * Orders a transcript oldest-first by `created_at`.
 *
 * Array position is not a reliable ordering for stored chats, so anything order-sensitive
 * establishes chronological order itself rather than trusting the array it was handed.
 * Sending a conversation to the API out of order feeds Claude the discussion backwards.
 */
export function toChronological(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
}

/**
 * True when an answer carries no actual content — `undefined`, `""`, or whitespace only.
 *
 * The whitespace case is not hypothetical: a stream that errors after emitting only
 * indentation, or an API text block of pure whitespace, leaves a placeholder chat whose
 * `answer` is truthy but semantically empty. `!answer` catches `""` and misses `"   "`,
 * and the surviving turn is then sent to the API as a real assistant turn — risking a 400
 * on the NEXT request and, short of that, feeding Claude a nonsense turn.
 *
 * Single definition shared by the three sites that must agree on it — `chatTransformer`
 * below (request build) and both persistence paths in `src/hooks/useChat.tsx` (the
 * stream-error handler and the non-streaming path). Those drifting apart is what let a
 * whitespace-only answer reach the wire.
 */
export function isBlankAnswer(answer: string | undefined): boolean {
  return !answer || answer.trim().length === 0;
}

/**
 * Builds the Anthropic message list for a request. Order is load-bearing here: sending
 * turns out of order feeds Claude the conversation backwards.
 *
 * Turns with a blank answer are dropped — a failed or aborted request leaves a
 * placeholder chat behind, and serializing it would inject an empty assistant turn.
 * "Blank" means empty OR whitespace-only (`isBlankAnswer`), not merely falsy.
 */
export function chatTransformer(chat: Chat[]): Message[] {
  const messages: Message[] = [];
  toChronological(chat).forEach(({ question, answer }) => {
    if (isBlankAnswer(answer)) return;
    messages.push({ role: "user", content: question });
    messages.push({
      role: "assistant",
      content: answer,
    });
  });
  return messages;
}

/** One `List.Item` accessory, in the shape `src/views/chat.tsx` renders via `accessories`. */
export type ChatAccessory = { tag: string; tooltip: string } | { text: string };

/**
 * Builds the accessories for one answer row in `src/views/chat.tsx`'s Results list: the
 * model/preset tag (when recorded — see `Chat.answer_model` in `src/type.ts` for why an
 * old or legacy answer with none renders NO accessory rather than a guessed one) followed
 * by the existing `#N` counter, in that order so the counter's position never moves
 * depending on whether a row happens to carry a recorded model.
 *
 * Pure and React-free specifically so it's testable without a DOM — this codebase has no
 * jsdom, and the JSX this replaces could not be exercised any other way.
 */
export function buildAnswerAccessories(chat: Chat, positionFromEnd: number): ChatAccessory[] {
  const modelAccessory: ChatAccessory[] = chat.answer_model
    ? [{ tag: chat.answer_model, tooltip: `Answered by ${chat.answer_model}` }]
    : [];
  return [...modelAccessory, { text: `#${positionFromEnd}` }];
}
