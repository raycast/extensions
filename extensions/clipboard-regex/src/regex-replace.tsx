import { ActionPanel, Action, List, Clipboard, showHUD, popToRoot, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

interface ParsedSubstitution {
  pattern: RegExp;
  replacement: string;
}

const isDelimiterChar = (c: string | undefined) => c !== undefined && !/[a-zA-Z0-9\s]/.test(c);

function detectDelimiter(trimmed: string): { delimiter: string; start: number } | null {
  if (trimmed[0] === "s" && isDelimiterChar(trimmed[1])) {
    return { delimiter: trimmed[1], start: 2 };
  }
  if (isDelimiterChar(trimmed[0])) {
    return { delimiter: trimmed[0], start: 1 };
  }
  return null;
}

function scanSegment(s: string, start: number, delimiter: string): { content: string; next: number; closed: boolean } {
  let content = "";
  let i = start;
  while (i < s.length) {
    if (s[i] === "\\" && i + 1 < s.length) {
      content += s[i + 1] === delimiter ? delimiter : s.slice(i, i + 2);
      i += 2;
    } else if (s[i] === delimiter) {
      return { content, next: i + 1, closed: true };
    } else {
      content += s[i];
      i++;
    }
  }
  return { content, next: i, closed: false };
}

function parseSubstitution(input: string): ParsedSubstitution | null {
  const trimmed = input.trim();
  const head = detectDelimiter(trimmed);
  if (!head) return null;

  const patternSeg = scanSegment(trimmed, head.start, head.delimiter);
  if (!patternSeg.closed || patternSeg.content.length === 0) return null;

  const replacementSeg = scanSegment(trimmed, patternSeg.next, head.delimiter);
  const flags = trimmed.slice(replacementSeg.next);

  try {
    return { pattern: new RegExp(patternSeg.content, flags), replacement: replacementSeg.content };
  } catch {
    return null;
  }
}

function codeBlock(text: string): string {
  if (text.includes("```")) {
    return text
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n");
  }
  return "```\n" + text + "\n```";
}

function countAllMatches(text: string, sub: ParsedSubstitution): number {
  const globalFlags = sub.pattern.flags.includes("g") ? sub.pattern.flags : sub.pattern.flags + "g";
  return (text.match(new RegExp(sub.pattern.source, globalFlags)) || []).length;
}

export default function ClipboardRegexReplace() {
  const [searchText, setSearchText] = useState("");

  const {
    data: clipboardText,
    isLoading,
    error: clipError,
  } = usePromise(async () => {
    const text = await Clipboard.readText();
    return text ?? "";
  });

  const original = clipboardText ?? "";
  const sub = searchText ? parseSubstitution(searchText) : null;
  const result = sub ? original.replace(sub.pattern, sub.replacement) : original;
  const hasChanges = sub !== null && result !== original;
  const isGlobal = sub?.pattern.global ?? false;
  const totalMatches = sub ? countAllMatches(original, sub) : 0;
  const replacedCount = isGlobal ? totalMatches : Math.min(totalMatches, 1);

  const errorMsg = clipError
    ? "Could not read clipboard"
    : searchText && !sub
      ? "Invalid pattern. Use: s/find/replace/flags or /find/replace/flags"
      : "";

  let markdown: string;
  if (errorMsg) {
    markdown = `*${errorMsg}*`;
  } else if (!sub) {
    markdown = codeBlock(original) + "\n\n*Type a substitution, e.g.* `s/foo/bar/g` *or* `/foo/bar/g`";
  } else if (!hasChanges) {
    markdown = `**0 matches**\n\n` + codeBlock(original);
  } else {
    markdown = codeBlock(result);
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="s/find/replace/flags"
      isShowingDetail
      filtering={false}
    >
      <List.Item
        title="Result"
        icon={hasChanges ? Icon.CheckCircle : Icon.Circle}
        accessories={
          sub
            ? [
                ...(hasChanges ? [{ tag: { value: `${replacedCount} replaced`, color: Color.Green } }] : []),
                { tag: { value: isGlobal ? "Global" : "First", color: isGlobal ? Color.Blue : Color.SecondaryText } },
              ]
            : []
        }
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            {hasChanges && (
              <Action
                title="Copy Result to Clipboard"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(result);
                  await showHUD("Copied to clipboard");
                  await popToRoot();
                }}
              />
            )}
            <Action.CopyToClipboard title="Copy Original" content={original} icon={Icon.Document} />
          </ActionPanel>
        }
      />
    </List>
  );
}
