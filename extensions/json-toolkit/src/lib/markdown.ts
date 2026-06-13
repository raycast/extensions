function longestBacktickRun(input: string): number {
  let longest = 0;
  let current = 0;

  for (const character of input) {
    if (character === "`") {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

export function buildCodeBlock(input: string, language = ""): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(input) + 1));
  return `${fence}${language}\n${input}\n${fence}`;
}

export function buildFormatResultMarkdown(
  input: string,
  language: string,
  isFallback: boolean,
): string {
  const codeBlock = buildCodeBlock(input, language);

  if (!isFallback) {
    return codeBlock;
  }

  return `> Invalid JSON · Best-effort formatting\n\n${codeBlock}`;
}
