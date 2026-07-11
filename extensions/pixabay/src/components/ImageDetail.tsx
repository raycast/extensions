import { ActionPanel, Detail, Toast, showToast } from "@raycast/api";

import type { Hit } from "@/types";

import { useImage } from "@/lib/hooks";
import { splitTagString } from "@/lib/utils";

import ImageCopyToClipboardAction from "@/components/ImageCopyToClipboardAction";
import ImageDownloadAction from "@/components/ImageDownloadAction";
import ImagePageOpenInBrowserAction from "@/components/ImagePageOpenInBrowserAction";

export default function ImageDetail(props: { hit: Hit }): JSX.Element {
  const hit = props.hit;
  const { base64, localFilepath, error } = useImage(hit.largeImageURL, hit.id.toString());
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not download Image", message: error });
  }
  const parts: string[] = [];
  if (base64) {
    parts.push(`![Preview](${base64})`);
  } else {
    parts.push("Download Image ...");
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
          <Detail.Metadata.Label title="Size" text={`${hit.imageWidth} x ${hit.imageHeight}`} />
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
          <ImagePageOpenInBrowserAction hit={hit} />
          <ImageDownloadAction localFilepath={localFilepath} hit={hit} />
          <ImageCopyToClipboardAction localFilepath={localFilepath} hit={hit} />
        </ActionPanel>
      }
    />
  );
}
