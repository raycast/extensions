import { Action, ActionPanel, Color, Grid, Icon } from "@raycast/api";

import type { Hit } from "@/types";

import { useImage } from "@/lib/hooks";
import { compactNumberFormat } from "@/lib/utils";

import ImageCopyToClipboardAction from "@/components/ImageCopyToClipboardAction";
import ImageDetail from "@/components/ImageDetail";
import ImagePageOpenInBrowserAction from "@/components/ImagePageOpenInBrowserAction";

export default function ImageGridItem(props: { hit: Hit }): JSX.Element {
  const hit = props.hit;
  const { localFilepath } = useImage(hit.largeImageURL, hit.id.toString());
  return (
    <Grid.Item
      title={`♥️${compactNumberFormat(hit.likes)} ⬇️${compactNumberFormat(hit.downloads)} 👁️${compactNumberFormat(
        hit.views,
      )}`}
      subtitle={hit.tags}
      content={hit.previewURL}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Image"
            target={<ImageDetail hit={hit} />}
            icon={{ source: Icon.Image, tintColor: Color.PrimaryText }}
          />
          <ImagePageOpenInBrowserAction hit={hit} />
          <ImageCopyToClipboardAction localFilepath={localFilepath} hit={hit} />
        </ActionPanel>
      }
    />
  );
}
