import Raycast, { Action, ActionPanel, Detail, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { exec, spawn } from "node:child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";

interface NumiArguments {
  queryArgument: string;
}

interface HistoryEntry {
  query: string;
  result: string;
}

const execp = promisify(exec);

export const NUMI_CLI_BINARY = "/opt/homebrew/bin/numi-cli";
export const HISTORY_MAX_LENGTH = 10;

export async function isHaveNumiCliVersion(): Promise<false|string> {
  try {
    const res = await execp(`${NUMI_CLI_BINARY} --version`, { shell: "/bin/bash" });
    console.log(res);
    if (res.stderr) {
      return false;
    }
    return res.stdout;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export default function Command(props: LaunchProps<{ arguments: NumiArguments }>) {
  const [isLoading, setIsLoading] = useState(true);
  const [isHaveNumi, setIsHaveNumi] = useState(false);
  const [, setNumiCLiVersion] = useState<string>('v0.0.0');
  const [query, setQuery] = useState<string|undefined>();
  const [queryResult, setQueryResult] = useState<string>();
  const [histories, setHistories] = useCachedState<HistoryEntry[]>("history", []);
  
  const queryOnNumi = async (query: string) => {
    if (!isHaveNumi) {
      return;
    }
    try {
      const res = await execp(`${NUMI_CLI_BINARY} "${query}"`, { shell: "/bin/bash" });
      console.log(res);
      if (res.stderr) {
        return;
      }
      let result = res.stdout;
      if (result.endsWith("\n")) result = result.slice(0, -1);
      result = Buffer.from(result).toString('utf8');
      setQueryResult(result);

      // set history
      if (query && result.trim() !== query.trim() && result) {
        setHistories((prev) => {
          let newHistory = [{ query, result }, ...prev];
          // just keep 10 items newest
          if (newHistory.length > HISTORY_MAX_LENGTH) {
            newHistory = newHistory.slice(0, HISTORY_MAX_LENGTH);
          }
          return newHistory;
        });
      }
    } catch (error) {
      console.error(error);
      setQueryResult(undefined);
    }
    setIsLoading(false);
  }

  const checkNumiCli = async () => {
    const res = await isHaveNumiCliVersion();
    setIsHaveNumi(typeof res === "string");
    if (typeof res === "string") setNumiCLiVersion(res);
  }

  useEffect(() => {
    checkNumiCli().then(() => {
      setIsLoading(false);
      setTimeout(() => {
        if (props.arguments.queryArgument !== "") {
          setQuery(props.arguments.queryArgument);
          setIsLoading(true);
        }
      }, 100)
    });
  }, []);

  useEffect(() => {
    console.log("isLoading", isLoading);
  }, [isLoading]);

  useEffect(() => {
    const q = query?.trim() ?? "";
    if (q.length === 0) {
      setQueryResult(undefined);
      return;
    }
    if (!isLoading) {
      return;
    }
    if (!isHaveNumi) {
      setIsLoading(false);
      return;
    }
    queryOnNumi(q);
  }, [query, isLoading]);

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      searchBarPlaceholder="Enter text to query"
      onSearchTextChange={(searchValue) => {
        const q = searchValue.length > 0 ? searchValue : undefined
        setQuery(q);
        if (q) {
          setIsLoading(true);
        }
      }}
    >
      <List.EmptyView
        icon="empty-view.png"
        title={isHaveNumi ? "Waiting for query" : "numi-cli not installed"}
        description={isHaveNumi ? "E.g.: 1+1..." : "Please install numi-cli first (brew install nikolaeu/numi/numi-cli)"}
      />
      {isHaveNumi && (
        <>
          <List.Section title={`Result "${query}"`}>
            {queryResult &&
              <List.Item
                title={queryResult}
                key={Math.random().toString()}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={queryResult} />
                    <Action.Paste content={queryResult} />
                  </ActionPanel>
                }
              />
            }
          </List.Section>
          <List.Section title="History">
            {histories &&
              histories.reverse().map((entry, index) => {
                return (
                  <List.Item
                    key={index}
                    title={entry.query}
                    accessories={[{ text: entry.result }]}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard content={entry.result} />
                        <Action.Paste content={entry.result} />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        </>
      )}
    </List>
  )
  // return <Detail markdown={`# Hello World ${JSON.stringify(props.arguments)}`} />;
}
