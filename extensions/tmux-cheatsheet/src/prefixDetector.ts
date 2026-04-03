import { readTmuxConfigs } from "./tmuxConfig";

const PREFIX_PATTERN = /^\s*set(?:-option)?\s+-g\s+prefix\s+(\S+)/;

function parsePrefix(contents: string): string | undefined {
  let prefix: string | undefined;
  for (const line of contents.split("\n")) {
    const match = line.match(PREFIX_PATTERN);
    if (match) {
      prefix = match[1]; // last one wins
    }
  }
  return prefix;
}

export function detectPrefix(): string | undefined {
  let detected: string | undefined;
  for (const contents of readTmuxConfigs()) {
    const prefix = parsePrefix(contents);
    if (prefix) {
      detected = prefix;
    }
  }
  return detected;
}
