import { Action, ActionPanel, Detail, Grid, Icon, showInFinder, showToast, Toast } from "@raycast/api";
import { mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { useSessionActivities } from "./jules";
import { Media, Session } from "./types";

const mimeTypeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function getExtensionFromMimeType(mimeType: string): string {
  return mimeTypeToExtension[mimeType] || mimeType.split("/")[1]?.split("+")[0] || "bin";
}

async function saveMediaToDownloads(media: Media, session: Session): Promise<string> {
  const downloadsPath = join(homedir(), "Downloads");
  await mkdir(downloadsPath, { recursive: true });

  const extension = getExtensionFromMimeType(media.mimeType);
  const filename = `${session.id}-${Date.now()}.${extension}`;
  const filepath = join(downloadsPath, filename);

  await writeFile(filepath, media.data, "base64");
  return filepath;
}

function SaveMediaAction(props: { media: Media; session: Session }) {
  return (
    <Action
      title="Save to Downloads"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Saving media to downloads...",
        });
        try {
          const savedPath = await saveMediaToDownloads(props.media, props.session);
          toast.style = Toast.Style.Success;
          toast.title = "Media saved to downloads";
          toast.message = savedPath;
          toast.primaryAction = {
            title: "Open in Finder",
            onAction: () => {
              showInFinder(savedPath);
            },
          };
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to save media";
          toast.message = error instanceof Error ? error.message : String(error);
        }
      }}
    />
  );
}

function LargeMediaView(props: { media: Media; index: number; session: Session }) {
  const markdown = `![Artifact ${props.index + 1}](data:${props.media.mimeType};base64,${props.media.data})`;
  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Artifact ${props.index + 1}`}
      actions={
        <ActionPanel>
          <SaveMediaAction media={props.media} session={props.session} />
        </ActionPanel>
      }
    />
  );
}

export default function ViewMedia(props: { session: Session }) {
  const { data: activities, isLoading } = useSessionActivities(props.session.name);

  const mediaArtifacts: Media[] =
    activities
      ?.flatMap((activity) => activity.artifacts ?? [])
      .map((artifact) => artifact.media)
      .filter((media): media is Media => !!media) ?? [];

  return (
    <Grid isLoading={isLoading} navigationTitle="Media Artifacts">
      {mediaArtifacts.length === 0 && !isLoading ? (
        <Grid.EmptyView title="No Media Found" description="This session has no media artifacts." />
      ) : (
        mediaArtifacts.map((media, index) => (
          <Grid.Item
            key={index}
            content={{ source: `data:${media.mimeType};base64,${media.data}` }}
            title={`Artifact ${index + 1}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Large"
                  icon={Icon.Maximize}
                  target={<LargeMediaView media={media} index={index} session={props.session} />}
                />
                <SaveMediaAction media={media} session={props.session} />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
