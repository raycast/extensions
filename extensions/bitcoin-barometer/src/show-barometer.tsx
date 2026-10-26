import { Detail, Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { describeError, fetchBarometer } from "./barometer";

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(fetchBarometer);
  if (error) {
    return (
      <Detail
        markdown={`# Barometer unavailable\n\n${describeError(error)}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }
  if (!data) return <Detail isLoading={isLoading} markdown="Loading" />;
  const change =
    data.change7dPct === null ? "not available" : `${data.change7dPct}%`;
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
      markdown={`# ${data.score}/100\n\nZone: ${data.zone}\n\nA description of the current reading against its history, not a forecast or investment advice.`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Score" text={`${data.score}/100`} />
          <Detail.Metadata.Label title="Zone" text={data.zone} />
          <Detail.Metadata.Label
            title="Computed"
            text={new Date(data.computedAt).toLocaleString()}
          />
          <Detail.Metadata.Label title="7-day change" text={change} />
          <Detail.Metadata.Link
            title="Methodology"
            target={data.methodologyUrl}
            text="Methodology"
          />
        </Detail.Metadata>
      }
    />
  );
}
