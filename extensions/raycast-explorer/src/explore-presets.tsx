import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { getAvatarIcon, useCachedPromise, useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

import { getAvailableAiModels } from "./api";
import { CategoryDropdownItems } from "./catalog";
import { Preset, PresetCategory } from "./data/presets";
import { getCreativityIcon, getIcon, platformShortcut, prepareModel, raycastProtocol } from "./helpers";

const CONTRIBUTE_URL = "https://github.com/raycast/ray-so";
const baseUrl = "https://ray.so/presets";

export default function ExplorePresets() {
  const { data: aiModels, isLoading: isAiModelsLoading } = useCachedPromise(getAvailableAiModels);
  const { data: categories, isLoading } = useFetch<PresetCategory[]>(`https://ray.so/api/presets`);
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
          <CategoryDropdownItems categories={categories} />
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
                keywords={[category.name, preset.creativity || "unspecified"]}
                detail={
                  <List.Item.Detail
                    markdown={preset.instructions}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={preset.name} />
                        <List.Item.Detail.Metadata.Label title="Model" text={modelName} />
                        {preset.tools ? (
                          preset.tools.map((tool, i) => (
                            <List.Item.Detail.Metadata.Label
                              key={tool.id}
                              title={i === 0 ? "AI Extensions" : ""}
                              text={tool.name.charAt(0).toUpperCase() + tool.name.slice(1)}
                            />
                          ))
                        ) : (
                          <>
                            <List.Item.Detail.Metadata.Label
                              title="Creativity"
                              text={
                                preset.creativity
                                  ? preset.creativity.charAt(0).toUpperCase() + preset.creativity.slice(1)
                                  : "Not specified"
                              }
                              icon={getCreativityIcon(preset.creativity)}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Web Search"
                              text={preset.web_search ? "On" : "Off"}
                            />
                            {preset.image_generation ? (
                              <List.Item.Detail.Metadata.Label title="Image Generation" text="On" />
                            ) : null}
                          </>
                        )}
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
                      shortcut={platformShortcut(["cmd"], ".")}
                      content={preset.instructions}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL to Share"
                      shortcut={platformShortcut(["cmd", "shift"], "s")}
                      icon={Icon.Link}
                      content={`${baseUrl}/preset/${preset.id}`}
                    />
                    <ActionPanel.Section>
                      <Action.OpenInBrowser
                        title="Contribute"
                        icon={Icon.PlusSquare}
                        shortcut={platformShortcut(["cmd", "shift"], "c")}
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
