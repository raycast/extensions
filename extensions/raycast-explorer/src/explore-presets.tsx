import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { getAvatarIcon, useCachedPromise, useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

import { getAvailableAiModels } from "./api";
import { Preset, PresetCategory } from "./data/presets";
import { getIcon, raycastProtocol } from "./helpers";

const CONTRIBUTE_URL = "https://github.com/raycast/preset-explorer/blob/main/data/presets.ts";
const baseUrl = "https://presets.ray.so";

export default function ExplorePresets() {
  const { data: aiModels, isLoading: isAiModelsLoading } = useCachedPromise(getAvailableAiModels);
  const { data: categories, isLoading } = useFetch<PresetCategory[]>(`${baseUrl}/api/presets`);
  const [selectedCategory, setSelectedCategory] = useState("");

  const filteredCategories = useMemo(() => {
    if (selectedCategory === "") {
      return categories;
    }

    return categories?.filter((category) => category.slug === selectedCategory);
  }, [selectedCategory, categories]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, category, or creativity"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Category" onChange={setSelectedCategory} value={selectedCategory}>
          <List.Dropdown.Item icon={Icon.BulletPoints} title="All Categories" value="" />
          {categories?.map((category) => {
            const icon = getIcon(category.icon || "");
            return (
              <List.Dropdown.Item
                key={category.slug}
                title={category.name}
                icon={Icon[icon] ?? Icon.List}
                value={category.slug}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {filteredCategories?.map((category) => (
        <List.Section key={category.name} title={category.name}>
          {category.presets.map((preset) => {
            const addToRaycastUrl = `${raycastProtocol}presets/import?${makeQueryString(preset)}`;
            const icon = getIcon(preset.icon || "");

            const aiModel = aiModels?.find((model) => model.id === preset.model);
            const modelName =
              isAiModelsLoading && !aiModels
                ? "Loading…"
                : `${aiModel?.provider_name || ""} ${aiModel?.name || ""}`.trim();
            return (
              <List.Item
                key={preset.id}
                title={preset.name}
                icon={Icon[icon] ?? Icon.Code}
                keywords={[category.name, preset.creativity]}
                detail={
                  <List.Item.Detail
                    markdown={preset.instructions}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={preset.name} />
                        <List.Item.Detail.Metadata.Label title="Model" text={modelName} />
                        <List.Item.Detail.Metadata.Label
                          title="Creativity"
                          text={preset.creativity.charAt(0).toUpperCase() + preset.creativity.slice(1)}
                          icon={getCreativityIcon(preset.creativity)}
                        />
                        <List.Item.Detail.Metadata.Label title="Web Search" text={preset.web_search ? "On" : "Off"} />
                        {preset.image_generation ? (
                          <List.Item.Detail.Metadata.Label title="Image Generation" text="On" />
                        ) : null}
                        {preset.author ? (
                          <List.Item.Detail.Metadata.Label
                            title="Author"
                            text={preset.author.name}
                            icon={getAvatarIcon(preset.author.name)}
                          />
                        ) : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Open title="Add to Raycast" icon={Icon.RaycastLogoNeg} target={addToRaycastUrl} />
                    <Action.CopyToClipboard
                      title="Copy Instructions"
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      content={preset.instructions}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL to Share"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      icon={Icon.Link}
                      content={`${baseUrl}/preset/${preset.id}`}
                    />
                    <ActionPanel.Section>
                      <Action.OpenInBrowser
                        title="Contribute"
                        icon={Icon.PlusSquare}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        url={CONTRIBUTE_URL}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function getCreativityIcon(creativity: Preset["creativity"]) {
  if (creativity === "none") {
    return Icon.CircleDisabled;
  }

  if (creativity === "low") {
    return Icon.StackedBars1;
  }

  if (creativity === "medium") {
    return Icon.StackedBars2;
  }

  if (creativity === "high") {
    return Icon.StackedBars3;
  }

  if (creativity === "maximum") {
    return Icon.StackedBars4;
  }
}

function makeQueryString(preset: Preset): string {
  const { name, instructions, description, creativity, icon, model, web_search, image_generation, id } = preset;

  return `preset=${encodeURIComponent(
    JSON.stringify({
      name,
      description,
      instructions,
      creativity,
      icon,
      model: prepareModel(model),
      web_search,
      image_generation,
      id,
    }),
  )}`;
}

function prepareModel(model: Preset["model"]) {
  if (model && /^".*"$/.test(model)) {
    return model.slice(1, model.length - 1);
  }
  return model;
}
