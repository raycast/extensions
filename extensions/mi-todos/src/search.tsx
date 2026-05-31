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

interface Preferences {
  mitodosDir: string;
  wikiPath: string;
}

interface QmdResult {
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

function SearchResults({ query }: { query: string }) {
  const prefs = getPreferenceValues<Preferences>();
  const mitodosDir = resolvePath(expandHome(prefs.mitodosDir));
  const wikiPath = resolvePath(expandHome(prefs.wikiPath));
  const { push } = useNavigation();

  const { data, isLoading } = usePromise(
    async () => {
      if (!query.trim()) return { todos: [] as QmdResult[], wiki: [] as QmdResult[] };

      const todos = searchMitodos(mitodosDir, query);
      const wiki = searchWikiWithQmd(wikiPath, query, 10);

      return { todos, wiki };
    },
    [query],
  );

  if (!query.trim()) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Search your MiToDos"
        description="Type to search across your tasks and notes"
      />
    );
  }

  if (isLoading) {
    return <List.EmptyView icon={Icon.CircleProgress} title="Searching..." />;
  }

  const todos = data?.todos ?? [];
  const wiki = data?.wiki ?? [];
  const total = todos.length + wiki.length;

  if (total === 0) {
    return <List.EmptyView icon={Icon.XMarkCircle} title="No results" description={`Nothing matched "${query}"`} />;
  }

  return (
    <>
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
    </>
  );
}

export default function Command(props: { arguments: { query?: string } }) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");

  return (
    <List
      searchBarPlaceholder="Search your tasks..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={false}
      throttle
    >
      <SearchResults query={searchText} />
    </List>
  );
}
