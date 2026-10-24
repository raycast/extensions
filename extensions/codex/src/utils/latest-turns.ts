export function renderLatestTurnsMarkdown({
  response,
  userMessage,
}: {
  response: string;
  userMessage: string;
}): string {
  return `### Last Codex turn:\n\n${createMarkdownCodeBlock(response)}\n\n---\n\n### Last User reply:\n\n${createMarkdownCodeBlock(userMessage)}`;
}

function createMarkdownCodeBlock(markdown: string): string {
  // Keep embedded code fences literal, even when a preview cuts one short.
  let fenceLength = 3;
  for (const match of markdown.matchAll(/`+/g)) {
    fenceLength = Math.max(fenceLength, match[0].length + 1);
  }
  const fence = "`".repeat(fenceLength);
  return `${fence}markdown\n${markdown}\n${fence}`;
}

export function getLatestTurnsLoadingOrErrorMarkdown(
  isLoading: boolean,
  error?: Error,
): string | null {
  if (error) {
    return `_Unable to load latest turns._\n\n${error.message}`;
  }

  if (isLoading) {
    return "_Loading latest turns…_";
  }

  return null;
}
