import { Action, ActionPanel, Clipboard, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { sanitizeMarkdownFenceContent } from "./sanitize-markdown-code";

// Snippet taken from https://github.com/gchq/CyberChef/blob/master/src/core/Utils.mjs#L221 and changed to support TypeScript
function parseEscapedChars(str: string): string {
  return str.replace(
    /\\([abfnrtv'"]|[0-3][0-7]{2}|[0-7]{1,2}|x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]{1,6}\}|\\)/g,
    (m, a) => {
      switch (a[0]) {
        case "\\":
          return "\\";
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
          return String.fromCharCode(parseInt(a, 8));
        case "a":
          return String.fromCharCode(7);
        case "b":
          return "\b";
        case "t":
          return "\t";
        case "n":
          return "\n";
        case "v":
          return "\v";
        case "f":
          return "\f";
        case "r":
          return "\r";
        case '"':
          return '"';
        case "'":
          return "'";
        case "x":
          return String.fromCharCode(parseInt(a.slice(1), 16));
        case "u":
          if (a[1] === "{") return String.fromCodePoint(parseInt(a.slice(2, -1), 16));
          else return String.fromCharCode(parseInt(a.slice(1), 16));
        default:
          return m; // If no match, return the original string
      }
    },
  );
}

const LANGUAGES = ["json", "javascript", "python", "bash", "html", "text"];

export default function Command() {
  const { data, isLoading } = usePromise(async () => {
    const { text: clipboard } = await Clipboard.read();
    return clipboard;
  });
  const unescapedString = parseEscapedChars(data || "");
  const safeForMarkdown = sanitizeMarkdownFenceContent(unescapedString);
  const [language, setLanguage] = useState("text");
  const [searchText, setSearchText] = useState("");

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard key="copyToClipboard" content={unescapedString} />
          <ActionPanel.Submenu
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            title="Change Language"
            icon={Icon.Code}
            filtering
            onSearchTextChange={(searchText) => {
              setSearchText(searchText.toLocaleLowerCase());
            }}
          >
            {LANGUAGES.filter((lang) => lang.toLocaleLowerCase().includes(searchText)).length === 0 && (
              <Action
                title={searchText.charAt(0).toUpperCase() + searchText.slice(1)}
                onAction={() => setLanguage(searchText)}
              />
            )}
            {LANGUAGES.map((lang) => (
              <Action
                key={lang}
                title={lang.charAt(0).toUpperCase() + lang.slice(1)}
                onAction={() => setLanguage(lang)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
      markdown={isLoading ? "Loading..." : `\`\`\`${language}\n${safeForMarkdown}\n\`\`\``}
    />
  );
}
