import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect } from "react";

type CommandResult = {
  command: string;
  stdout: string | undefined;
  stderr: string | undefined;
};

export default function Command() {
  const [results, setResults] = useState<CommandResult[]>([]);
  const [code, setCode] = useState<string | undefined>();
  const [runningCode, setRunningCode] = useState<string | undefined>();
  const [pendingCode, setPendingCode] = useState<string | undefined>();

  const { isLoading, data } = useExec<CommandResult, undefined>("swift", ["repl"], {
    execute: !!runningCode?.trim(),
    input: runningCode,
    parseOutput: ({ stdout, stderr }) => {
      return {
        command: code,
        stdout,
        stderr,
      } as CommandResult;
    },
  });

  useEffect(() => {
    if (pendingCode && data && (data.stdout || data.stderr)) {
      data.command = pendingCode;
      setResults([data, ...results]);
      setCode(undefined);
      setPendingCode(undefined);
    }
  }, [data]);

  function run() {
    const command = `
    import Foundation

    print(${code})
    `
      .replace(/^\s*/g, "")
      .trim();
    setPendingCode(code);
    setRunningCode(command);
  }

  return (
    <List
      onSearchTextChange={setCode}
      searchBarPlaceholder="Enter some Swift…"
      actions={
        <ActionPanel title="Run">
          <Action title="Run" onAction={run} />
        </ActionPanel>
      }
    >
      {isLoading ? (
        <List.EmptyView key="running" icon={Icon.Hourglass} description={"Running…"} />
      ) : results.length == 0 ? (
        <List.EmptyView key="empty" icon={data ? "none" : Icon.Snippets} description={"No result yet."} />
      ) : (
        ["Run", results].map((result) => {
          if (result === "Run") {
            return (
              <List.Item
                key="run"
                title="Run"
                actions={
                  <ActionPanel title="Run">
                    <Action title="Run" onAction={run} />
                  </ActionPanel>
                }
              />
            );
          } else if (result) {
            return (
              <List.Section key="Past Results" title="Past Results">
                {results.map((result) => {
                  if (result.stderr) {
                    return <List.Item key={Math.random()} title={result.command || ""} subtitle={result.stderr} />;
                  } else {
                    return (
                      <List.Item
                        key={Math.random()}
                        title={result.command || ""}
                        subtitle={result.stdout || "(No Output)"}
                      />
                    );
                  }
                })}
              </List.Section>
            );
          }
        })
      )}
    </List>
  );
}
