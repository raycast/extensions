import { ActionPanel, Detail, Toast, showToast } from "@raycast/api";

import type { VideoHit, Videos } from "@/types";

import { useImage } from "@/lib/hooks";
import { capitalizeFirstLetter, splitTagString } from "@/lib/utils";
import { getPreviewUrl } from "@/lib/videos";

import VideoDownloadAction from "@/components/VideoDownloadAction";
import VideoPageOpenInBrowserAction from "@/components/VideoPageOpenInBrowserAction";

export default function VideoDetail(props: { hit: VideoHit }): JSX.Element {
  const hit = props.hit;
  const { base64, error } = useImage(getPreviewUrl(hit, "small"), hit.id.toString());
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not download Image", message: error });
  }
  const parts: string[] = [];
  if (base64) {
    parts.push(`![Preview](${base64})`);
  } else {
    parts.push("Download Video Preview ...");
  }
  const md = parts.join("\n");
  const tags = splitTagString(hit.tags);
  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Author">
            <Detail.Metadata.TagList.Item text={hit.user} icon={hit.userImageURL} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Tags">
            {tags?.map((t) => <Detail.Metadata.TagList.Item key={t} text={t} />)}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Likes" text={`♥️ ${hit.likes}`} />
          <Detail.Metadata.Label title="Downloads" text={`${hit.downloads}`} />
          <Detail.Metadata.Label title="Views" text={`${hit.views}`} />
          <Detail.Metadata.Label title="Comments" text={`${hit.comments}`} />
          <Detail.Metadata.Link
            title="License"
            text="Pixabay License"
            target="https://pixabay.com/de/service/license"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <VideoPageOpenInBrowserAction hit={hit} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Videos">
            {Object.entries(hit.videos)
              .filter(([, v]) => {
                // filter out videos without a URL
                return v.url !== "";
              })
              .map(([k, v]) => (
                <VideoDownloadAction
                  key={k}
                  video={v}
                  size={k as keyof Videos}
                  title={capitalizeFirstLetter(k)}
                  hit={hit}
                />
              ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
