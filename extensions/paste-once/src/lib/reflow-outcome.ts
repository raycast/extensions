import { MarkdownReformatter } from "./markdown-reformatter";

export type ReflowOutcome =
  | { status: "empty" }
  | { status: "not-markdown" }
  | { status: "already-clean"; text: string; original: string }
  | { status: "reflowed"; text: string; original: string };

export function reflowOutcome(input: string | null): ReflowOutcome {
  const text = input?.trim() ?? "";
  if (!text) return { status: "empty" };
  if (!MarkdownReformatter.isLikelyMarkdown(text)) return { status: "not-markdown" };

  const reformatted = MarkdownReformatter.reformat(text);
  if (reformatted === text) return { status: "already-clean", text, original: text };
  return { status: "reflowed", text: reformatted, original: text };
}
