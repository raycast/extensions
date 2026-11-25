import { Action, ActionPanel, Icon, List, open, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { api, Clip, Job } from "./ripclip";

type Batch = { job: Job; clips: Clip[] };

async function latest(): Promise<Batch[]> {
  const { jobs } = await api<{ jobs: Job[] }>("/jobs?status=done&kind=generate&limit=10");
  return Promise.all(
    jobs.map(async (job) => ({ job, clips: (await api<{ clips: Clip[] }>(`/results/${job.job_id}`)).clips })),
  );
}

// download links are signed for 5 minutes, so a download asks for a fresh one
async function download(jobId: string, clipId: string) {
  try {
    const { clips } = await api<{ clips: Clip[] }>(`/results/${jobId}`);
    const clip = clips.find((c) => c.clip_id === clipId);
    if (clip) await open(clip.download_url);
  } catch (e) {
    await showFailureToast(e, { title: "No download link" });
  }
}

const length = (seconds: number) => {
  const s = Math.round(seconds); // round first, or 59.6 shows as 0:60
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function LatestClips() {
  const { data, error, isLoading, revalidate } = useCachedPromise(latest, [], { keepPreviousData: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your clips">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load your clips"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Video}
          title="No clips yet"
          description="Import a video with Import Video Link, then find clips in RipClip"
        />
      )}
      {data?.map(({ job, clips }) => (
        <List.Section
          key={job.job_id}
          title={job.name || "Video"}
          subtitle={clips.length === 1 ? "1 clip" : `${clips.length} clips`}
        >
          {clips.map((clip) => (
            <List.Item
              key={clip.clip_id}
              icon={Icon.FilmStrip}
              title={clip.title || "Untitled clip"}
              accessories={[{ text: length(clip.duration_seconds) }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Editor" url={clip.editor_url} />
                  <Action
                    title="Download Clip"
                    icon={Icon.Download}
                    onAction={() => download(job.job_id, clip.clip_id)}
                  />
                  <Action.CopyToClipboard title="Copy Editor Link" content={clip.editor_url} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
