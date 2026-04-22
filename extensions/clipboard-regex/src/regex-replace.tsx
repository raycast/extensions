import { ActionPanel, Action, List, Clipboard, showHUD, popToRoot, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

interface ParsedSubstitution {
  pattern: RegExp;
  replacement: string;
}

function parseSubstitution(input: string): ParsedSubstitution | null {
  const trimmed = input.trim();

  const isDelimiter = (c: string) => c !== undefined && !/[a-zA-Z0-9\s]/.test(c);

  let delimiter: string;
  let i: number;
  if (trimmed[0] === "s" && isDelimiter(trimmed[1])) {
    delimiter = trimmed[1];
    i = 2;
  } else if (isDelimiter(trimmed[0])) {
    delimiter = trimmed[0];
    i = 1;
  } else {
    return null;
  }
  let pattern = "";
  let foundSecondDelimiter = false;
  while (i < trimmed.length) {
    if (trimmed[i] === "\\" && i + 1 < trimmed.length) {
      if (trimmed[i + 1] === delimiter) {
        pattern += delimiter;
        i += 2;
      } else {
        pattern += trimmed.slice(i, i + 2);
        i += 2;
      }
    } else if (trimmed[i] === delimiter) {
      foundSecondDelimiter = true;
      i++;
      break;
    } else {
      pattern += trimmed[i];
      i++;
    }
  }

  // Require the second delimiter (like vim: `s/foo/` not `s/foo`)
  if (!foundSecondDelimiter) return null;

  let replacement = "";
  while (i < trimmed.length) {
    if (trimmed[i] === "\\" && i + 1 < trimmed.length) {
      if (trimmed[i + 1] === delimiter) {
        replacement += delimiter;
        i += 2;
      } else {
        replacement += trimmed.slice(i, i + 2);
        i += 2;
      }
    } else if (trimmed[i] === delimiter) {
      i++;
      break;
    } else {
      replacement += trimmed[i];
      i++;
    }
  }

  const flags = trimmed.slice(i);
  if (pattern.length === 0) return null;

  try {
    return { pattern: new RegExp(pattern, flags), replacement };
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
