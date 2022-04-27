import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { spawnSync, execSync } from "child_process";
import { useState, useEffect, useRef, useCallback } from "react";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) => search(text, false)}
      searchBarPlaceholder="Search Process by Name..."
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} killCallback={ ()=>{
            search(state.searchText, false);
          } } />
        ))}
      </List.Section>
      {state.left > 0 ? (
        <List.Section title="More">
          <List.Item
            title={`There are ${state.left} items left...`}
            accessoryTitle={String(state.left)}
            actions={
              <ActionPanel>
                <Action title="Show All Items" onAction={() => search(state.searchText, true)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function SearchListItem({ searchResult, killCallback }: { searchResult: SearchResult, killCallback: () => void }) {
  return (
    <List.Item
      icon={{ fileIcon: searchResult.icon }}
      key={searchResult.id}
      title={searchResult.name}
      subtitle={searchResult.description}
      accessoryTitle={String(searchResult.pid)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Kill Process"
              icon={Icon.XmarkCircle}
              onAction={() => {
                spawnSync(`kill -9 ${searchResult.pid}`, [], { shell: true });
                showToast({
                  style: Toast.Style.Success,
                  title: `Process Killed`,
                  message: `Kill Process ${searchResult.name} (${searchResult.pid}) Complete`,
                });
                killCallback();
              }}
            />
            <Action.CopyToClipboard
              title="Copy Full CMD Path"
              content={searchResult.cmd}
              onCopy={(cmd) => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Cmd Copied",
                  message: String(cmd),
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true, searchText: "", left: 0 });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string, listAll: boolean) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
        searchText: searchText,
        left: 0,
      }));
      try {
        const [results, left] = await performSearch(searchText, cancelRef.current.signal, listAll);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
          left: left,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
          left: 0,
        }));

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("", false);
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(
  searchText: string,
  signal: AbortSignal,
  listAll: boolean
): Promise<[SearchResult[], number]> {
  console.log("start to search ", searchText);
  const command = `ps aux | sort -nrk 3,3 | sed '$d' | grep -i "${searchText}"`;
  // const results = spawn(command, {shell: true, stdio: 'pipe', maxBuffer: 100 * 1024 * 1024, env: {"PATH": '/usr/sbin/:/usr/bin/'}});
  return new Promise((resolve) => {
    console.log(command);
    const data = execSync(command);
    const tmpItems = String(data)
      .match(/(\S+\s+){10,10}.+/g)
      ?.filter((line) => line.length > 5);
    const count = tmpItems?.length || 0;
    const items = tmpItems
      ?.slice(0, listAll ? count : 30)
      .map((result: string) => {
        try {
          const lineDetail = /((\S+\s+){10,10})(.+)/g.exec(result);

          //console.log(lineDetail);
          const info = lineDetail ? lineDetail[1].trim() : "";
          const cmd = lineDetail ? lineDetail[3] : "";

          const columns = info.match(/\S+/g);
          const list = columns || [];

          const appName = execSync(`ps -o command -cp ${list[1]} | tail -n +2`)?.toString()?.trim();

          const appPath = execSync(`ps -o comm= -p ${list[1]}`)?.toString();
          const app = /.+?\.app/.exec(appPath);

          return {
            id: list[1],
            icon: app ? app[0] : "",
            name: appName,
            description: `CPU: ${list[2]}, MEM: ${list[3]}`,
            type: list[7],
            cmd: cmd,
            pid: parseInt(list[1]),
          };
        } catch (err) {
          // console.log(err);
        }
        return { id: "fake", icon: "fake", name: "fake", cmd: "", pid: -1 };
      })
      .filter((it) => it.pid !== -1);

    items !== undefined ? resolve([items, listAll ? 0 : count - 30]) : resolve([[], 0]);
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  searchText: string;
  left: number;
}

interface SearchResult {
  id: string;
  icon: string;
  name: string;
  description?: string;
  type?: string;
  cmd: string;
  pid: number;
}
