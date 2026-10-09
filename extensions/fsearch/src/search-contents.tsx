import { Action, ActionPanel, Icon, List, showToast, Toast, type LaunchProps } from "@raycast/api";
import { useState } from "react";
import { FileActions } from "./components/file-actions";
import { StatusView } from "./components/status-view";
import { splitContentQuery } from "./lib/content-query";
import { editorName, openAtLine, preferredEditor } from "./lib/editors";
import { grep, type GrepFile, type GrepMode } from "./lib/fsearch";
import { fileName, folderOf } from "./lib/format";
import { useFSearch } from "./lib/use-fsearch";

const NARROW = "The search stopped early. Add ext:, type:, or in: to search fewer files.";

const MODES: { value: GrepMode; title: string; placeholder: string }[] = [
  { value: "literal", title: "Text", placeholder: "Find text in your files" },
  { value: "regex", title: "Regular Expression", placeholder: "Find a regular expression in your files" },
  { value: "symbol", title: "Definition", placeholder: "Find where a function or type is defined" },
];

export default function Command({ fallbackText }: LaunchProps) {
  const [text, setText] = useState(fallbackText ?? "");
  const [mode, setMode] = useState<GrepMode>("literal");
  const { pattern, q } = splitContentQuery(text);
  const execute = pattern.length > 0;

  const { data, isLoading, error, indexing, revalidate } = useFSearch(
    (signal, p: string, query: string, m: GrepMode) => grep(p, query, m, signal),
    [pattern, q, mode],
    execute,
  );

  const files = execute && !error ? (data?.files ?? []) : [];
  // The daemon stops reading at its time budget; the best-ranked files come first.
  const incomplete = execute && !error && !isLoading && data?.complete === false;

  return (
    <List
      isLoading={isLoading || indexing}
      filtering={false}
      throttle
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder={MODES.find((m) => m.value === mode)?.placeholder}
      searchBarAccessory={
        <List.Dropdown tooltip="Match" storeValue onChange={(value) => setMode(value as GrepMode)}>
          {MODES.map((m) => (
            <List.Dropdown.Item key={m.value} value={m.value} title={m.title} />
          ))}
        </List.Dropdown>
      }
    >
      {!execute ? (
        <List.EmptyView
          icon={Icon.Text}
          title="Search Inside Your Files"
          description={
            "Type the text to find. Uppercase letters make it case-sensitive.\nNarrow it with ext:swift, type:code, or in:~/Developer."
          }
        />
      ) : error ? (
        <StatusView error={error} onRetry={revalidate} />
      ) : files.length === 0 ? (
        <List.EmptyView
          icon={Icon.Text}
          title={isLoading ? "Searching…" : incomplete ? "No Matches Yet" : "No Matches"}
          description={incomplete ? NARROW : undefined}
        />
      ) : (
        <>
          {files.map((file) => (
            <FileSection key={file.path} file={file} />
          ))}
          {incomplete && (
            <List.Section title="Some Files Weren't Searched">
              <List.Item icon={Icon.Info} title={NARROW} />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function FileSection({ file }: { file: GrepFile }) {
  const editor = preferredEditor();
  return (
    <List.Section title={fileName(file.path)} subtitle={folderOf(file.path)}>
      {file.matches.map((match) => (
        <List.Item
          key={`${file.path}:${match.line}`}
          id={`${file.path}:${match.line}`}
          icon={{ fileIcon: file.path }}
          title={match.text.trim().slice(0, 240) || " "}
          accessories={[{ text: `Line ${match.line}` }]}
          quickLook={{ path: file.path, name: fileName(file.path) }}
          actions={
            <FileActions
              path={file.path}
              isFolder={false}
              primary={
                editor !== "default" && (
                  <Action
                    title={`Open in ${editorName(editor)}`}
                    icon={Icon.ArrowRight}
                    onAction={() =>
                      openAtLine(file.path, match.line, editor).catch((e) =>
                        showToast({ style: Toast.Style.Failure, title: "Couldn't Open the File", message: String(e) }),
                      )
                    }
                  />
                )
              }
            >
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Line"
                  content={match.text.trim()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
                <Action.CopyToClipboard title="Copy Path and Line" content={`${file.path}:${match.line}`} />
              </ActionPanel.Section>
            </FileActions>
          }
        />
      ))}
    </List.Section>
  );
}
