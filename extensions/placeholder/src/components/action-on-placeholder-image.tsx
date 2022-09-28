import { Action, ActionPanel, Icon } from "@raycast/api";
import StylizePlaceholderImage from "../stylize-placeholder-image";
import { setWallpaper } from "../utils/common-utils";
import { PicsumImageAction } from "./picsum-image-action";
import { ActionOpenPreferences } from "./action-open-preferences";
import React, { Dispatch, SetStateAction } from "react";
import { PicsumImage } from "../types/types";
import { Preferences } from "../types/preferences";
import { RevealImageAction } from "./reveal-image-action";

export function ActionOnPlaceholderImage(props: {
  picsumImage: PicsumImage;
  preferences: Preferences;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  const { picsumImage, preferences, page, setPage } = props;
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
        target={<StylizePlaceholderImage id={picsumImage.id} width={picsumImage.width} height={picsumImage.height} />}
      />
      <Action
        icon={Icon.Desktop}
        title={"Set Desktop Wallpaper"}
        onAction={() => {
          setWallpaper(picsumImage.download_url, "wallpaper-" + Date.now()).then();
        }}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.ChevronUp}
          title={"Previous Page"}
          shortcut={{ modifiers: ["cmd"], key: "pageUp" }}
          onAction={() => {
            if (page > 1) {
              setPage(page - 1);
            }
          }}
        />
        <Action
          icon={Icon.ChevronDown}
          title={"Next Page"}
          shortcut={{ modifiers: ["cmd"], key: "pageDown" }}
          onAction={() => setPage(page + 1)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <PicsumImageAction
          imageURL={picsumImage.download_url}
          size={picsumImage.width + "x" + picsumImage.height}
          primaryAction={preferences.primaryAction}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <RevealImageAction
          imageURL={picsumImage.download_url}
          size={picsumImage.width + "x" + picsumImage.height}
          primaryAction={preferences.primaryAction}
        />
        <Action.OpenInBrowser
          title={"Open in Unsplash"}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
          url={picsumImage.url}
        />
        <Action.CopyToClipboard
          shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
          title={"Copy Unsplash URL"}
          content={picsumImage.url}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
