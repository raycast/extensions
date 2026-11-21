import { Action, ActionPanel, Color, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ErrorView from "./components/ErrorView";
import MeetingView from "./components/MeetingView";
import { sparkJSON } from "./lib/spark";
import { sparkIcon } from "./lib/sparkIcons";
import { MeetingsResult, formatDuration, toDate } from "./lib/types";
import { useRefreshNotice } from "./lib/ui";
import { withSparkCLI } from "./components/SparkSetup";

function Command() {
  const { data, isLoading, error, pagination, revalidate } = usePromise(
    () =>
      async ({ page }: { page: number }) => {
        const result = await sparkJSON<MeetingsResult>(["meetings", "--page", String(page + 1), "--page-size", "50"]);
        return { data: result.meetings, hasMore: result.page.page < result.page.total_pages };
      },
    [],
    { onError: () => undefined },
  );

  useRefreshNotice(error, (data?.length ?? 0) > 0, revalidate);

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Filter meetings">
      {error && !data?.length ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={sparkIcon("MeetingNotes", Color.SecondaryText)} title="No meeting notes yet" />
      )}
      {(data ?? []).map((meeting) => {
        const id = String(meeting.id);
        const duration = formatDuration(meeting.duration_seconds);
        return (
          <List.Item
            key={id}
            icon={sparkIcon("MeetingNotes", Color.SecondaryText)}
            title={meeting.title ?? "(untitled)"}
            accessories={[
              ...(duration ? [{ text: duration, icon: sparkIcon("Clock", Color.SecondaryText) }] : []),
              { date: toDate(meeting.date) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Notes"
                  icon={sparkIcon("MeetingNotes", Color.SecondaryText)}
                  target={<MeetingView meetingId={id} />}
                />
                <Action.CopyToClipboard title="Copy Meeting ID" content={id} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default withSparkCLI(Command);
