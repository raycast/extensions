import {
  Action,
  ActionPanel,
  List,
  Icon,
  confirmAlert,
  Alert,
  getPreferenceValues,
  clearSearchBar,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect } from "react";

type CommandResult = {
  id: number;
  command: string;
  stdout: string | undefined;
  stderr: string | undefined;
};

export default function Command() {
  const [results, setResults] = useState<CommandResult[]>([]);
  const [clearSearchAfterExecution, setClearSearchAfterExecution] = useState<boolean>(false);
  const [code, setCode] = useState<string | undefined>();
  const [runningCode, setRunningCode] = useState<string | undefined>();
  const [pendingCode, setPendingCode] = useState<string | undefined>();
  const [selectedID, setSelectedID] = useState<string | undefined>();
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const { isLoading, data } = useExec<CommandResult, undefined>("swift", ["repl"], {
    execute: !!runningCode?.trim(),
    input: runningCode,
    parseOutput: ({ stdout, stderr }) => {
      if (clearSearchAfterExecution) {
        clearSearchBar();
      }

      return {
        id: results.length,
        command: code,
        stdout,
        stderr,
      } as CommandResult;
    },
  });

  useEffect(() => {
    if (pendingCode && data && (data.stdout || data.stderr)) {
      data.id = results.length;
      data.command = pendingCode;
      setResults([data, ...results]);
      setRunningCode(undefined);
      setPendingCode(undefined);
      setSelectedID(String(data.id));
    }
  }, [data, runningCode]);

  async function run(clear: boolean = false) {
    setClearSearchAfterExecution(clear);
    if (!code?.trim()) {
      return;
    }

    if (
      !(await confirmAlert({
        title: "This command runs code.",
        message: "Running untrusted code can be dangerous. Do you want to continue?",
        primaryAction: { title: "Continue", style: Alert.ActionStyle.Destructive },
        rememberUserChoice: true,
      }))
    ) {
      return;
    }

    const command = `
    import Foundation

    print(${code})
    `
      .replace(/^\s*/g, "")
      .trim();
    setPendingCode(code);
    setRunningCode(command);
  }

  useEffect(() => {
    setSelectedID("run");
  }, [code]);

  function markdownFor(result: CommandResult): string {
    const label = result.stderr ? "Error:" : "Output:";

    const string =
      "Input:\n```swift\n" +
      result.command +
      "\n```\n" +
      label +
      "\n```swift\n" +
      (result.stderr || result.stdout || "No output.") +
      "\n```";

    return string;
  }

  const runAction = <Action title="Run" icon={Icon.Wand} onAction={() => run()} />;
  const runAndClearAction = <Action title="Run and Clear Searchbar" icon={Icon.Wand} onAction={() => run(true)} />;

  const getActions = (
    <ActionPanel title="Run">
      {preferences.defaultAction === "run" ? runAction : runAndClearAction}
      {preferences.defaultAction === "run" ? runAndClearAction : runAction}
    </ActionPanel>
  );

  return (
    <List
      onSearchTextChange={setCode}
      searchBarPlaceholder="Enter some Swift…"
      isShowingDetail
      selectedItemId={selectedID}
      actions={getActions}
    >
      {isLoading ? (
        <List.EmptyView key="running" icon={Icon.Hourglass} description={"Running…"} />
      ) : results.length == 0 ? (
        <List.EmptyView key="empty" icon={data ? "none" : Icon.Snippets} description={"No result yet."} />
      ) : (
        ["Run", results].map((result) => {
          if (result === "Run") {
            return <List.Item id="run" key="run" title="Run" actions={getActions} />;
          } else if (result) {
            return (
              <List.Section key="Past Results" title="Past Results">
                {results.map((result) => {
                  return (
                    <List.Item
                      id={String(result.id)}
                      key={String(result.id)}
                      title={result.command || ""}
                      subtitle={result.stdout || "(No Output)"}
                      detail={<List.Item.Detail markdown={markdownFor(result)} />}
                      actions={getActions}
                    />
                  );
                })}
              </List.Section>
            );
          }
        })
      )}
    </List>
  );
}
