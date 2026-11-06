import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { formatPrice, listModels, Modality, modelTitle } from "./api";

const MODALITY_ICON: Record<string, Icon> = { image: Icon.Image, video: Icon.FilmStrip, audio: Icon.Music };

export default function Command() {
  const [modality, setModality] = useState<Modality | "all">("all");
  const { data, isLoading } = useCachedPromise(
    (value: Modality | "all") => listModels({ modality: value === "all" ? undefined : value }),
    [modality],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Could not load models" });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search models, for example kling or seedance"
      searchBarAccessory={
        <List.Dropdown tooltip="Type" value={modality} onChange={(value) => setModality(value as Modality | "all")}>
          <List.Dropdown.Item value="all" title="All Types" />
          <List.Dropdown.Item value="image" title="Image" icon={Icon.Image} />
          <List.Dropdown.Item value="video" title="Video" icon={Icon.FilmStrip} />
          <List.Dropdown.Item value="audio" title="Audio" icon={Icon.Music} />
        </List.Dropdown>
      }
    >
      {data?.map((item) => (
        <List.Item
          key={item.model}
          icon={MODALITY_ICON[item.modality ?? ""] ?? Icon.Stars}
          title={modelTitle(item)}
          subtitle={item.model}
          keywords={[item.model, item.family ?? "", ...(item.tasks ?? [])]}
          accessories={[{ text: formatPrice(item.usd) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Model ID" content={item.model} />
              <Action.OpenInBrowser title="Open API Docs" url="https://popnow.ai/docs" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
