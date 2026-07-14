import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRunErrors, dagsterRunUrl, type RunErrorEvent } from "../api";

interface Props {
  runId: string;
  jobName: string;
}

function errorMarkdown(event: RunErrorEvent): string {
  const lines: string[] = [];

  if (event.stepKey) {
    lines.push(`# Step: ${event.stepKey}`);
  } else {
    lines.push("# Run Failure");
  }
  lines.push("");

  if (event.error) {
    if (event.error.className) {
      lines.push(`**${event.error.className}**: ${event.error.message}`);
    } else {
      lines.push(event.error.message);
    }
    lines.push("");

    if (event.error.stack.length > 0) {
      lines.push("```");
      lines.push(event.error.stack.join(""));
      lines.push("```");
    }
  } else {
    lines.push(event.message);
  }

  return lines.join("\n");
}

export default function RunErrors({ runId, jobName }: Props) {
  const { data: errors, isLoading } = useCachedPromise(fetchRunErrors, [runId]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`${jobName} — Errors`}
      searchBarPlaceholder="Filter errors..."
    >
      <List.EmptyView title="No Errors" description="No error events found for this run." />
      {errors?.map((event, idx) => (
        <List.Item
          key={idx}
          icon={{ source: Icon.XMarkCircle, tintColor: "#FF6B6B" }}
          title={event.error?.className ?? event.__typename.replace("Event", "")}
          accessories={[{ text: event.stepKey ?? "run" }]}
          detail={<List.Item.Detail markdown={errorMarkdown(event)} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Run in Dagster"
                url={dagsterRunUrl(runId)}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              {event.error && (
                <Action.CopyToClipboard
                  title="Copy Error"
                  content={event.error.stack.length > 0 ? event.error.stack.join("") : event.error.message}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
