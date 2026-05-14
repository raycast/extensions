const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function summarize(text: string) {
  const compactText = text.replace(/\s+/g, " ").trim();

  if (compactText.length === 0) {
    return "Empty dictation";
  }

  return compactText.length > 120
    ? `${compactText.slice(0, 117)}...`
    : compactText;
}

export function formatDate(createdAtMs: number) {
  return DATE_FORMATTER.format(new Date(createdAtMs));
}

export function getWordCount(text: string) {
  const matches = text.trim().match(/\S+/g);

  return matches?.length ?? 0;
}

export function getCodeFence(text: string) {
  const longestBacktickRun = Math.max(
    2,
    ...Array.from(text.matchAll(/`+/g), (match) => match[0].length),
  );

  return "`".repeat(longestBacktickRun + 1);
}

export function formatDictationMarkdown(text: string) {
  if (text.trim().length === 0) {
    return "_Empty dictation_";
  }

  return escapeMarkdown(text).replace(/\r\n/g, "\n").replace(/\n/g, "  \n");
}

function escapeMarkdown(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
}
