import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { NotLoggedInError, PAGE_SIZE, listRecordings, webLink } from "./plaud";

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "–";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SearchRecordings() {
  const { data, isLoading, error, revalidate, pagination } = usePromise(
    () => async (options: { page: number }) => {
      const recordings = await listRecordings(options.page + 1);
      return { data: recordings, hasMore: recordings.length === PAGE_SIZE };
    },
    [],
    {
      onError: (err) => {
        if (!(err instanceof NotLoggedInError)) {
          showFailureToast(err, { title: "Could not load recordings" });
        }
      },
    },
  );

  if (error instanceof NotLoggedInError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="Plaud CLI login required"
          description="Run `npm install -g @plaud-ai/cli` then `plaud login` in your terminal, and try again."
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.CopyToClipboard
                title="Copy Setup Command"
                content="npm install -g @plaud-ai/cli && plaud login"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Search recordings…">
      <List.EmptyView icon={Icon.Microphone} title="No recordings" description="Nothing found in your Plaud account" />
      {data?.map((rec) => (
        <List.Item
          key={rec.id}
          icon={Icon.Waveform}
          title={rec.name || "Untitled"}
          accessories={[
            { text: formatDuration(rec.duration) },
            { date: new Date(rec.created_at), tooltip: new Date(rec.created_at).toLocaleString() },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={webLink(rec.id)} />
              <Action.CopyToClipboard title="Copy Link" content={webLink(rec.id)} />
              <Action.CopyToClipboard title="Copy Title" content={rec.name} shortcut={Keyboard.Shortcut.Common.Copy} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
