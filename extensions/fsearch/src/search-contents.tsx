import { Action, ActionPanel, Icon, List, showToast, Toast, type LaunchProps } from "@raycast/api";
import { useState } from "react";
import { FileActions } from "./components/file-actions";
import { StatusView } from "./components/status-view";
import { splitContentQuery } from "./lib/content-query";
import { editorName, openAtLine, preferredEditor } from "./lib/editors";
import { grep, type GrepFile, type GrepMode } from "./lib/fsearch";
import { expandHome, fileName, folderOf, formatDuration } from "./lib/format";
import { useFSearch } from "./lib/use-fsearch";

const NARROW = "The search stopped early. Add ext:, type:, or in: to search fewer files.";

const MODES: { value: GrepMode; title: string; placeholder: string }[] = [
  { value: "literal", title: "Text", placeholder: "Find text in your files" },
  { value: "regex", title: "Regular Expression", placeholder: "Find a regular expression in your files" },
  { value: "symbol", title: "Definition", placeholder: "Find where a function or type is defined" },
];

export default function Command({
  arguments: args,
  fallbackText,
}: LaunchProps<{ arguments: Arguments.SearchContents }>) {
  const [text, setText] = useState(args.text || fallbackText || "");
  const [mode, setMode] = useState<GrepMode>((args.mode as GrepMode) || "literal");
  const folder = args.folder?.trim() ? expandHome(args.folder) : undefined;
  const { pattern, q } = splitContentQuery(text);
  const execute = pattern.length > 0;

  const { data, isLoading, error, indexing, revalidate } = useFSearch(
    (signal, p: string, query: string, m: GrepMode) =>
      grep(p, query, m, signal, folder ? { filters: { in: folder } } : {}),
    [pattern, q, mode],
    execute,
  );

  const files = execute && !error ? (data?.files ?? []) : [];
  const timing = execute && !error && data ? formatDuration(data.tookMicros) : undefined;
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
      navigationTitle={folder ? `Search File Contents in ${fileName(folder)}` : undefined}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Match"
          {...(args.mode ? { defaultValue: args.mode } : { storeValue: true })}
          onChange={(value) => setMode(value as GrepMode)}
        >
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
          description={isLoading ? undefined : incomplete ? (timing ? `${NARROW}\n${timing}` : NARROW) : timing}
        />
      ) : (
        <>
          {files.map((file, index) => (
            <FileSection key={file.path} file={file} timing={index === 0 ? timing : undefined} />
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

function FileSection({ file, timing }: { file: GrepFile; timing?: string }) {
  const editor = preferredEditor();
  const name = fileName(file.path);
  return (
    <List.Section title={timing ? `${timing} · ${name}` : name} subtitle={folderOf(file.path)}>
      {file.matches.map((match) => (
        <List.Item
          key={`${file.path}:${match.line}`}
          id={`${file.path}:${match.line}`}
          icon={{ fileIcon: file.path }}
          title={match.text.trim().slice(0, 240) || " "}
          accessories={[{ text: `Line ${match.line}` }]}
          quickLook={{ path: file.path, name }}
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
