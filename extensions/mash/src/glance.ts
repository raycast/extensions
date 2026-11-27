/**
 * A glance at a chat as the list's detail pane shows it, in Markdown: the
 * match with the message before and after it. Raycast draws Markdown only, so
 * who spoke is a small picture and a bold name on one line, the reader's own
 * messages are block quotes, and the match carries a label and the searched
 * words in bold. Everything from the chat goes through the defusing in
 * markdown.ts; only the pictures made here are live.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { literal, quoted, rendered } from "./markdown";
import { agentLogo, type Glimpse, speaker } from "./mash";

/** What a glance knows besides the messages. */
export interface GlanceOptions {
  /** The chat's agent, by Mash's ID; empty when Mash did not say. */
  readonly agent: string;
  /** Whether the chat was opened at a search match, rather than as a recent chat. */
  readonly matched: boolean;
  /** The words to set in bold in the match. */
  readonly terms?: readonly string[];
  /** The Markdown picture for a speaker; empty when there is none. */
  readonly picture?: (who: Speaker) => string;
}

/** Whose picture a message carries: the reader's, or an agent's by its ID. */
export type Speaker = { readonly kind: "you" } | { readonly kind: "agent"; readonly agent: string };

/** The side of a speaker's picture, in points: the height of a line of text. */
const PICTURE_SIZE = 16;
/** How much of the match is shown, and of the message on each side of it. */
const MATCH_LENGTH = 1200;
const NEIGHBOUR_LENGTH = 400;
/** A step's text is tool input or output, shown literally and shorter. */
const STEP_LENGTH = 600;

/**
 * The words of a search to mark in the match: whole words of three or more
 * characters, without the commonest English ones, which would mark half a
 * message without saying why it matched.
 */
export function queryTerms(query: string): string[] {
  const common = new Set(["the", "and", "for", "with", "that", "this", "from", "was", "are", "not", "but", "you"]);
  const words = query.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
  return [...new Set(words.filter((word) => word.length >= 3 && !common.has(word)))].slice(0, 8);
}

/**
 * The Markdown picture for a speaker: the agent's tile, or the reader's mark,
 * from the extension's assets folder, in the version drawn for Raycast's
 * appearance. Empty for an agent without a logo. Raycast reads the size from
 * the address's query.
 */
export function speakerPicture(who: Speaker, assets: string, dark: boolean): string {
  const name = who.kind === "you" ? "you" : agentLogo(who.agent);
  if (!name) return "";
  const file = pathToFileURL(join(assets, "agent-tiles", `${name}-${dark ? "dark" : "light"}.svg`));
  return `![](${file.href}?raycast-width=${PICTURE_SIZE}&raycast-height=${PICTURE_SIZE})`;
}

/** One message: who said it on a line, then what was said. */
function said({ message, match }: Glimpse, options: GlanceOptions): string {
  const marked = match && options.matched;
  const who: Speaker | undefined =
    message.role === "user"
      ? { kind: "you" }
      : message.role === "assistant"
        ? { kind: "agent", agent: options.agent }
        : undefined;
  const picture = who ? (options.picture?.(who) ?? "") : "";
  const name = `${picture ? `${picture} ` : ""}**${speaker(message.role, options.agent)}**`;
  const line = marked ? `${name} · \`Match\`` : name;
  // A step is shown only when it is the match; its text is tool input or output.
  if (message.step) return `${line}\n\n${literal(message.content, STEP_LENGTH)}`;
  const body = rendered(message.content, match ? MATCH_LENGTH : NEIGHBOUR_LENGTH, marked ? (options.terms ?? []) : []);
  return `${line}\n\n${message.role === "user" ? quoted(body) : body}`;
}

/** The glance's Markdown: each message under its speaker, oldest first. */
export function glanceMarkdown(glimpses: readonly Glimpse[], options: GlanceOptions): string {
  return glimpses.map((glimpse) => said(glimpse, options)).join("\n\n");
}
