import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { expandHome, resolvePath, readFile } from "./util/storage";
import { searchMitodos, searchWikiWithQmd } from "./util/qmd";

interface SearchResult {
  path: string;
  snippet: string;
  score: number;
}

function ContentDetail({ filepath, fileName }: { filepath: string; fileName: string }) {
  let content = "(file not readable)";
  try {
    content = readFile(filepath);
  } catch {
    // keep fallback
  }

  return (
    <Detail
      markdown={`# ${fileName}\n\n\`\`\`markdown\n${content.slice(0, 5000)}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Path" content={filepath} />
          <Action.CopyToClipboard title="Copy Content" content={content} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: { arguments?: { query?: string } }) {
  const [searchText, setSearchText] = useState(props.arguments?.query ?? "");
  const prefs = getPreferenceValues<Preferences>();
  const mitodosDir = resolvePath(expandHome(prefs.mitodosDir));
  const wikiPath = prefs.wikiPath ? resolvePath(expandHome(prefs.wikiPath)) : "";
  const { push } = useNavigation();

  const { data, isLoading } = usePromise(
    async (q: string) => {
      if (!q.trim()) return { todos: [] as SearchResult[], wiki: [] as SearchResult[] };
      return {
        todos: searchMitodos(mitodosDir, q),
        wiki: wikiPath ? searchWikiWithQmd(wikiPath, q, 10) : [],
      };
    },
    [searchText],
  );

  if (!searchText.trim()) {
    return (
      <List
        searchBarPlaceholder="Search your tasks..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
        throttle
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search your MiToDos"
          description="Type to search across your tasks and notes"
        />
      </List>
    );
  }

  if (isLoading) {
    return (
      <List
        searchBarPlaceholder="Search your tasks..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
        throttle
      >
        <List.EmptyView icon={Icon.CircleProgress} title="Searching..." />
      </List>
    );
  }

  const todos = data?.todos ?? [];
  const wiki = data?.wiki ?? [];

  if (todos.length === 0 && wiki.length === 0) {
    return (
      <List
        searchBarPlaceholder="Search your tasks..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
        throttle
      >
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No results"
          description={`Nothing matched "${searchText}"`}
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search your tasks..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {todos.length > 0 && (
        <List.Section title="MiToDos">
          {todos.map((r, i) => {
            const fileName = r.path.split("/").pop()?.replace(/\.md$/, "") || r.path;
            return (
              <List.Item
                key={`todo-${i}`}
                icon={Icon.CheckCircle}
                title={fileName}
                subtitle={r.snippet.slice(0, 120)}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Content"
                      icon={Icon.Eye}
                      onAction={() => push(<ContentDetail filepath={r.path} fileName={fileName} />)}
                    />
                    <Action.CopyToClipboard title="Copy Path" content={r.path} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {wiki.length > 0 && (
        <List.Section title="Wiki (QMD)">
          {wiki.map((r, i) => {
            const fileName = r.path.split("/").pop()?.replace(/\.md$/, "") || r.path;
            return (
              <List.Item
                key={`wiki-${i}`}
                icon={Icon.Document}
                title={fileName}
                subtitle={r.snippet.slice(0, 120)}
                accessories={[{ text: r.score > 0 ? `${(r.score * 100).toFixed(0)}%` : "" }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Content"
                      icon={Icon.Eye}
                      onAction={() => push(<ContentDetail filepath={r.path} fileName={fileName} />)}
                    />
                    <Action.CopyToClipboard title="Copy Path" content={r.path} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
