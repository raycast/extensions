import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getFlashspacePath, parseLines } from "../utils/cli";

export default function ListDisplays() {
  const flashspace = getFlashspacePath();

  const { isLoading, data, revalidate } = useExec(flashspace, ["list-displays"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list displays" },
  });

  const { data: activeDisplay } = useExec(flashspace, ["get-display"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active display" },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search displays...">
      {data?.map((display) => (
        <List.Item
          key={display}
          title={display}
          icon={Icon.Monitor}
          accessories={activeDisplay === display ? [{ tag: "Active" }] : []}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Display Name" content={display} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
