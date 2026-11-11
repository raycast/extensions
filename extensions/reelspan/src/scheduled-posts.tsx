import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { LoadError } from "./components/load-error";
import { client } from "./lib/client";
import { networkName } from "./lib/reelspan";

type Job = { job_id: string; scheduled_date?: string; title?: string; platforms?: string[]; profile_username?: string };

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(
    async () => {
      const r = (await client().scheduled.list()) as Record<string, unknown>;
      return ((r.scheduled_posts ?? r.scheduled ?? r.jobs ?? []) as Job[]).sort((a, b) =>
        String(a.scheduled_date).localeCompare(String(b.scheduled_date)),
      );
    },
    [],
    { failureToastOptions: { title: "Could not load scheduled posts" } },
  );

  async function cancel(job: Job) {
    const ok = await confirmAlert({
      title: "Cancel this post?",
      message: job.title || job.job_id,
      primaryAction: { title: "Cancel Post", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await client().scheduled.cancel(job.job_id);
      await showToast({ style: Toast.Style.Success, title: "Canceled" });
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Could not cancel" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter scheduled posts">
      {error ? (
        <LoadError title="Could not load scheduled posts" error={error} onRetry={revalidate} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Calendar}
            title="Nothing scheduled"
            description="Create a post with a time to see it here."
          />
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
                  <Action.CopyToClipboard title="Copy Job ID" content={job.job_id} />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Cancel Post"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => cancel(job)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
