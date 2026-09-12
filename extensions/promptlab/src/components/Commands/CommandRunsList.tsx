import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Command, PLCommandRunProperties } from "../../lib/commands/types";
import { useState } from "react";
import RunCommandAction from "./actions/RunCommandAction";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import DeleteAction from "../actions/DeleteAction";
import { loadCommands } from "../../lib/commands";

type CommandRunsListProps = {
  command: Command;
  setCommands: (commands: Command[]) => void;
  settings: AdvancedSettings;
};

export default function CommandRunsList(props: CommandRunsListProps) {
  const { command, setCommands, settings } = props;
  const [runs, setRuns] = useState<PLCommandRunProperties[]>(command.runs || []);

  return (
    <List
      searchBarPlaceholder="Search Runs"
      isShowingDetail={!!command.runs?.length}
      navigationTitle={`${command.name} - Previous Runs`}
    >
      <List.EmptyView title="No Previous Runs" icon={Icon.XMarkCircle} />
      {runs.map((run) => {
        const dateString = run.timestamp
          ? new Date(run.timestamp).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
            })
          : "";
        return (
          <List.Item
            key={run.id}
            title={dateString}
            actions={
              <ActionPanel>
                <RunCommandAction
                  command={command}
                  setCommands={setCommands}
                  settings={settings}
                  onCompletion={(newRun) => {
                    setRuns([newRun, ...runs]);
                  }}
                />
                <DeleteAction
                  object={run}
                  settings={settings}
                  revalidateObjects={async () => {
                    setRuns(runs.filter((r) => r.id !== run.id));
                    const newCommands = await loadCommands();
                    setCommands(newCommands);
                  }}
                />
                <ActionPanel.Section title="Clipboard Actions">
                  <Action.CopyToClipboard title="Copy ID" content={run.id} />
                  <Action.CopyToClipboard title="Copy Prompt" content={run.prompt} />
                  {run.error ? (
                    <Action.CopyToClipboard title="Copy Error" content={run.error} />
                  ) : (
                    <Action.CopyToClipboard title="Copy Response" content={run.response} />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={
                  run.error?.length
                    ? `# Error\n\n${run.error}`
                    : `# Response\n\n${run.response}\n\n# Full Prompt\n\n\`\`\`\n${run.prompt.replaceAll(
                        "`",
                        "\\`",
                      )}\n\`\`\``
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Run Number"
                      text={run.index.toString()}
                      icon={Icon.Hashtag}
                    />
                    <List.Item.Detail.Metadata.Label title="Date Executed" text={dateString} icon={Icon.Clock} />
                    <List.Item.Detail.Metadata.Label title="ID" text={run.id} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Prompt Length" text={`${run.prompt.length} Characters`} />
                    <List.Item.Detail.Metadata.Label
                      title="Response Length"
                      text={`${run.response.length} Characters`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
