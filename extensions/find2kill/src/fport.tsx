import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { spawnSync, execSync, exec } from "child_process";
import { useState, useEffect, useCallback } from "react";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Process by Port..."
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} callback={ () =>{
            search(state.searchText);
          } } />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult, callback }: { searchResult: SearchResult, callback: () => void }) {
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
                callback();
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
  const [state, setState] = useState<SearchState>({ results: [], searchText: "", isLoading: true });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        searchText: searchText,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string): Promise<SearchResult[]> {
  console.log("start to search ", searchText);
  const command = /^[0-9]+$/.test(searchText)
    ? `lsof -i:${searchText} -sTCP:LISTEN,FIN_WAIT_2,FIN_WAIT_1 | tail -n +2`
    : "lsof -iTCP -sTCP:LISTEN,FIN_WAIT_2,FIN_WAIT_1 -n -P | tail -n +2";
  return new Promise((resolve) => {
    console.log(command);
    exec(command, { env: { PATH: "/usr/bin:/usr/sbin" } }, function (err, stdout) {
      console.log(String(stdout).substring(2000));
      const items = String(stdout)
        .trim()
        .split("\n")
        .filter((line: string) => {
          return line.trim().length > 0;
        })
        .map((result: string) => {
          const re = result.split(/\s+/);

          const appName = execSync(`ps -o command -cp ${re[1]} | tail -n +2`).toString().trim();

          const appPath = execSync(`ps -o comm= -p ${re[1]}`).toString();
          const app = /.+?\.app/.exec(appPath);

          return {
            id: re[5],
            icon: app ? app[0] : "",
            name: appName,
            cmd: appPath,
            description: re[7] + ">" + re[8],
            type: re[7],
            pid: parseInt(re[1]),
          };
        });

      resolve(items);
    });
  });
}

interface SearchState {
  results: SearchResult[];
  searchText: string,
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  icon: string;
  name: string;
  cmd: string;
  description?: string;
  type?: string;
  pid: number;
}
