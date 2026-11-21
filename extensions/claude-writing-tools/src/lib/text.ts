/**
 * Re-applies the selection's leading and trailing whitespace to a model result, so replacing
 * "  hello\n" keeps the indentation and the newline the user selected.
 */
export function preserveWhitespace(original: string, result: string): string {
  const lead = original.match(/^\s*/)?.[0] ?? "";
  const trail = original.match(/\s*$/)?.[0] ?? "";
  if (lead.length === original.length) return result;
  return lead + result.trim() + trail;
}

/**
 * Removes wrappers a model sometimes adds around plain-text output: a single code fence or a
 * pair of matching quotes around the whole answer. Kept when the original itself had them.
 */
export function stripWrapping(output: string, original = ""): string {
  let text = output.trim();
  const source = original.trim();

  const fence = text.match(/^```[\w-]*\n([\s\S]*?)\n?```$/);
  if (fence && !source.startsWith("```")) text = fence[1];

  const pairs: [string, string][] = [
    ['"', '"'],
    ["“", "”"],
    ["«", "»"],
    ["'", "'"],
  ];
  for (const [open, close] of pairs) {
    if (text.length > 1 && text.startsWith(open) && text.endsWith(close) && !source.startsWith(open)) {
      const inner = text.slice(open.length, -close.length);
      if (!inner.includes(open) && !inner.includes(close)) text = inner;
      break;
    }
  }
  return text;
}

/**
 * Case- and accent-insensitive key for matching. Turkish casing turns "I" into "ı" and "İ" into
 * "i̇", so every i-variant collapses to a plain "i" before diacritics are stripped.
 */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Markdown to plain text for apps that would show the syntax literally (Slack, terminals). */
export function markdownToPlain(markdown: string): string {
  return markdown
    .replace(/```[\w-]*\n([\s\S]*?)```/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^(\s*)[-*+]\s+/gm, "$1• ")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Contents of the fenced code blocks in a Markdown answer. */
export function codeBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```[\w-]*\n([\s\S]*?)```/g)].map((m) => m[1].replace(/\n$/, ""));
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** First line of a text, collapsed and shortened for list titles. */
export function oneLine(text: string, max = 80): string {
  return truncate(text.replace(/\s+/g, " ").trim(), max);
}

export function countWords(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

/** Short inputs get a dictionary entry next to the translation. */
export function isShortPhrase(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.length > 0 && trimmed.length <= 40 && countWords(trimmed) <= 3 && !/[.!?\n]/.test(trimmed.slice(0, -1))
  );
}

export function blockquote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/** Raycast markdown has no HTML; escape characters that would otherwise start markup. */
export function escapeMarkdownInline(text: string): string {
  return text.replace(/([\\`*_[\]#<>|])/g, "\\$1");
}

/** Rough language guess for picking a `say` voice: Turkish letters → "tr", plain Latin → "en". */
export function guessLanguageCode(text: string): string | undefined {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (!letters.length) return undefined;
  const turkish = letters.filter((c) => "çğıöşüÇĞİÖŞÜ".includes(c)).length;
  if (turkish / letters.length > 0.01) return "tr";
  const latin = letters.filter((c) => /[a-z]/i.test(c)).length;
  return latin / letters.length > 0.9 ? "en" : undefined;
}

export function fileUrl(path: string): string {
  return `file://${encodeURI(path)}`;
}

export interface Throttled<T> {
  (value: T): void;
  cancel(): void;
}

/** Calls `fn` at most every `ms`, always delivering the latest value; for streaming UI updates. */
export function throttle<T>(fn: (value: T) => void, ms: number): Throttled<T> {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: T;
  const call = ((value: T) => {
    latest = value;
    const wait = ms - (Date.now() - last);
    if (wait <= 0) {
      last = Date.now();
      fn(value);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = undefined;
        last = Date.now();
        fn(latest);
      }, wait);
    }
  }) as Throttled<T>;
  call.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return call;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
