import type { Dispatch, SetStateAction } from "react";
import { Action, ActionPanel, Icon } from "@raycast/api";
import type { PicsumImage } from "@/types/types";
import { ActionOpenPreferences } from "@/components/action-open-preferences";
import { PicsumImageAction } from "@/components/picsum-image-action";
import { RevealImageAction } from "@/components/reveal-image-action";
import StylizePlaceholder from "@/pages/stylize-placeholder";

export function ActionOnPlaceholderImage(props: {
  picsumImage: PicsumImage;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  const { picsumImage, page, setPage } = props;
  return (
    <ActionPanel>
      <Action.Push
        icon={{
          source: {
            light: "stylize-placeholder-icon.png",
            dark: "stylize-placeholder-icon@dark.png",
          },
        }}
        title={"Stylize Image"}
        target={<StylizePlaceholder id={picsumImage.id} width={picsumImage.width} height={picsumImage.height} />}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.ChevronUp}
          title={"Previous Page"}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={() => {
            if (page > 1) {
              setPage(page - 1);
            }
          }}
        />
        <Action
          icon={Icon.ChevronDown}
          title={"Next Page"}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
          onAction={() => setPage(page + 1)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <PicsumImageAction imageURL={picsumImage.download_url} size={picsumImage.width + "x" + picsumImage.height} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <RevealImageAction imageURL={picsumImage.download_url} size={picsumImage.width + "x" + picsumImage.height} />
        <Action.OpenInBrowser
          title={"Open in Unsplash"}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
          url={picsumImage.url}
        />
        <Action.CopyToClipboard
          shortcut={{ modifiers: ["opt", "cmd"], key: "." }}
          title={"Copy Unsplash URL"}
          content={picsumImage.url}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
