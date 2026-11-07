import { pathToFileURL } from "node:url";
import { errorBlockMarkdown } from "../fm/explain";
import type { ChatTurn } from "./operations";

export const PENDING_ANSWER = "_Thinking..._";
export const EMPTY_ANSWER = "_No answer._";
const TURN_SEPARATOR = "\n\n---\n\n";

function imageUrl(imagePath: string): string {
  return pathToFileURL(imagePath).href.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export function turnToMarkdown(
  turn: ChatTurn,
  answerOverride?: string,
  isPending = false,
  failure?: ChatFailure,
): string {
  const quote = turn.user.content
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const image = turn.user.imagePath ? `\n\n![Attached image](${imageUrl(turn.user.imagePath)})` : "";
  const answer = answerOverride ?? turn.assistant?.content;
  const reason = turn.assistant?.interruptedReason;
  const block = failure
    ? `\n\n${errorBlockMarkdown(failure.title, failure.explanation)}`
    : reason
      ? `\n\n${errorBlockMarkdown(reason, turn.assistant?.interruptedExplanation)}`
      : "";
  return `**You**\n\n${quote}${image}\n\n**Local AI**\n\n${answer || (isPending ? PENDING_ANSWER : EMPTY_ANSWER)}${block}`;
}

export interface StreamingAnswer {
  userId: string;
  text: string;
}

export interface ChatFailure {
  userId: string;
  title: string;
  explanation?: string;
}

export function conversationToMarkdown(turns: ChatTurn[], streaming?: StreamingAnswer, failure?: ChatFailure): string {
  return turns
    .map((turn) => {
      const isPending = streaming?.userId === turn.user.id;
      return turnToMarkdown(
        turn,
        isPending ? streaming.text : undefined,
        isPending,
        failure?.userId === turn.user.id ? failure : undefined,
      );
    })
    .join(TURN_SEPARATOR);
}

export function conversationToText(turns: ChatTurn[]): string {
  return turns
    .map((turn) => `**You**\n\n${turn.user.content}\n\n**Local AI**\n\n${turn.assistant?.content || EMPTY_ANSWER}`)
    .join(TURN_SEPARATOR);
}
