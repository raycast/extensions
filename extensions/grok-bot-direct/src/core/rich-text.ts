import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";

interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}
const parser = unified().use(remarkParse).use(remarkMath).use(remarkGfm);

function protectedSpans(source: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  function visit(node: MarkdownNode): void {
    if (
      ["code", "inlineCode", "math", "inlineMath", "table"].includes(node.type)
    ) {
      const start = node.position?.start.offset,
        end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) spans.push({ start, end });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(parser.parse(source));
  for (const match of source.matchAll(
    /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\{(equation\*?|align\*?|aligned|math)\}[\s\S]*?\\end\{\1\}/g,
  )) {
    if (
      !spans.some((span) => match.index >= span.start && match.index < span.end)
    )
      spans.push({ start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

/** Restore block boundaries before line-based lists, including lists starting above 1. */
export function prepareReadableMarkdown(source: string): string {
  const spans = protectedSpans(source);
  const edits: number[] = [];
  const lines = source.split("\n");
  let position = 0;
  const list = /^ {0,3}(?:\d{1,6}[.)]|[-+*])\s+\S/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i],
      previous = lines[i - 1] ?? "";
    const isProtected = spans.some(
      (span) => position >= span.start && position < span.end,
    );
    if (
      !isProtected &&
      previous.trim() &&
      ((list.test(line) && !list.test(previous)) ||
        /^ {0,3}\*\*[^*\n]+\*\*:?[ \t\r]*$/.test(line))
    )
      edits.push(position);
    position += line.length + 1;
  }
  let output = source;
  for (const start of edits.reverse())
    output = output.slice(0, start) + "\n" + output.slice(start);
  return output;
}

/** Browser renderer accepts dollar math; code and original message source stay intact. */
export function prepareWebMarkdown(source: string): string {
  const input = prepareReadableMarkdown(source);
  const spans = protectedSpans(input);
  // Native delimiters are intentionally included in protectedSpans, so exclude only code/table/dollar math here.
  const codeSpans: { start: number; end: number }[] = [];
  function visit(node: MarkdownNode): void {
    if (
      ["code", "inlineCode", "math", "inlineMath", "table"].includes(node.type)
    ) {
      const start = node.position?.start.offset,
        end = node.position?.end.offset;
      if (start !== undefined && end !== undefined)
        codeSpans.push({ start, end });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(parser.parse(input));
  const edits: { start: number; end: number; text: string }[] = [];
  for (const span of spans) {
    if (
      codeSpans.some(
        (code) => span.start >= code.start && span.start < code.end,
      )
    )
      continue;
    const text = input.slice(span.start, span.end);
    if (text.startsWith("\\("))
      edits.push({ ...span, text: `$${text.slice(2, -2)}$` });
    else if (text.startsWith("\\["))
      edits.push({
        ...span,
        text: `\n\n$$\n${text.slice(2, -2).trim()}\n$$\n\n`,
      });
    else if (/^\\begin\{(?:equation\*?|math)\}/.test(text))
      edits.push({
        ...span,
        text: `\n\n$$\n${text
          .replace(/^\\begin\{[^}]+\}/, "")
          .replace(/\\end\{[^}]+\}$/, "")
          .trim()}\n$$\n\n`,
      });
  }
  let output = input;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  return output;
}

/** Adapt single-dollar math to Raycast's delimiters without touching code or prose. */
export function renderRichText(source: string): string {
  const input = prepareReadableMarkdown(source);
  const protectedRanges = protectedSpans(input);
  const changes: { start: number; end: number; value: string }[] = [];
  function visit(node: MarkdownNode): void {
    const start = node.position?.start.offset,
      end = node.position?.end.offset;
    if (start !== undefined && end !== undefined && node.type === "text") {
      const text = input.slice(start, end);
      for (const match of text.matchAll(/\r?\n/g)) {
        const position = start + match.index;
        if (
          !protectedRanges.some(
            (span) => position >= span.start && position < span.end,
          ) &&
          !/ {2}$/.test(input.slice(Math.max(0, position - 2), position))
        )
          changes.push({ start: position, end: position, value: "  " });
      }
    }
    if (
      node.type === "inlineMath" &&
      typeof node.value === "string" &&
      start !== undefined &&
      end !== undefined &&
      input[start] === "$" &&
      input[start + 1] !== "$" &&
      !(/^\d/.test(node.value) && /\d/.test(input[end] ?? ""))
    )
      changes.push({ start, end, value: `\\(${node.value}\\)` });
    for (const child of node.children ?? []) visit(child);
  }
  visit(parser.parse(input));
  let rendered = input;
  for (const change of changes.sort((a, b) => b.start - a.start))
    rendered =
      rendered.slice(0, change.start) +
      change.value +
      rendered.slice(change.end);
  return rendered;
}
