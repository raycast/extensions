import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { getPlaceholderImages } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { PlaceholderEmptyView } from "./components/placeholder-empty-view";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import StylizePlaceholderImage from "./stylize-placeholder-image";
import { PicsumImageAction } from "./components/picsum-image-action";

export default function SearchPlaceholderImage() {
  const { primaryAction } = getPreferenceValues<Preferences>();

  const [page, setPage] = useState<number>(1);

  const { picsumImages, isLoading } = getPlaceholderImages(page);

  return (
    <List isLoading={isLoading} isShowingDetail={true} searchBarPlaceholder={"Search images"}>
      <PlaceholderEmptyView />

      {picsumImages.map((value) => {
        return (
          <List.Item
            key={value.url}
            icon={{ source: { light: "picsum-icon.png", dark: "picsum-icon@dark.png" } }}
            title={{ value: value.author, tooltip: "Author" }}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={`<img src="${value.download_url}" alt="${value.author}" height="190" />`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Id" text={value.id} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Size" text={value.width + " ✕ " + value.height} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Download URL" text={value.download_url} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Unsplash URL" text={value.url} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  icon={{
                    source: {
                      light: "stylize-placeholder-icon.png",
                      dark: "stylize-placeholder-icon@dark.png",
                    },
                  }}
                  title={"Stylize Image"}
                  target={<StylizePlaceholderImage id={value.id} width={value.width} height={value.height} />}
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
                    imageURL={value.download_url}
                    size={value.width + "x" + value.height}
                    primaryAction={primaryAction}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={value.download_url} />
                  <Action.OpenInBrowser
                    title={"Open in Unsplash"}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    url={value.url}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
                    title={"Copy Unsplash URL"}
                    content={value.url}
                  />
                </ActionPanel.Section>
                <ActionOpenCommandPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
