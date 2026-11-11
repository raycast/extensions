import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { client } from "./lib/client";
import { errorMessage, networkName } from "./lib/reelspan";

type Job = { job_id: string; scheduled_date?: string; title?: string; platforms?: string[]; profile_username?: string };

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(
    async () => {
      const r = (await client().scheduled.list()) as Record<string, unknown>;
      return ((r.scheduled_posts ?? r.scheduled ?? r.jobs ?? []) as Job[]).sort((a, b) =>
        String(a.scheduled_date).localeCompare(String(b.scheduled_date)),
      );
    },
    [],
    {
      onError: (e) =>
        void showToast({
          style: Toast.Style.Failure,
          title: "Could not load scheduled posts",
          message: errorMessage(e),
        }),
    },
  );

  async function cancel(job: Job) {
    const ok = await confirmAlert({
      title: "Cancel this post?",
      message: job.title ?? job.job_id,
      primaryAction: { title: "Cancel Post", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await client().scheduled.cancel(job.job_id);
      await showToast({ style: Toast.Style.Success, title: "Cancelled" });
      revalidate();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not cancel", message: errorMessage(e) });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter scheduled posts">
      <List.EmptyView title="Nothing scheduled" description="Create a post with a time to see it here." />
      {(data ?? []).map((job) => (
        <List.Item
          key={job.job_id}
          icon={Icon.Calendar}
          title={job.title || "(no caption)"}
          subtitle={(job.platforms ?? []).map(networkName).join(", ")}
          accessories={[
            { text: job.profile_username },
            ...(job.scheduled_date
              ? [{ date: new Date(job.scheduled_date), tooltip: new Date(job.scheduled_date).toLocaleString() }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Cancel Post"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => cancel(job)}
              />
              <Action.CopyToClipboard title="Copy Job ID" content={job.job_id} />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
