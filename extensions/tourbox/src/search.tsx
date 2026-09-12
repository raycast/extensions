import { Action, ActionPanel, Color, Icon, List, showInFinder } from "@raycast/api";
import groupBy from "lodash/groupBy.js";
import { useEffect, useState } from "react";
import { allCategory, allPreset, downloadPreset, presetDetail } from "./api.js";
import { Category, Preset } from "./types.js";

export default function Search() {
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPreset] = useState<Preset[]>([]);

  const loadCategory = async () => {
    setIsLoading(true);
    const categories = await allCategory();
    setCategories(categories);
  };

  const loadPreset = async (categoryId: string) => {
    setIsLoading(true);
    const presets = await allPreset(categoryId);
    setPreset(presets);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCategory();
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    loadPreset(categoryId);
  }, [categoryId]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Category" value={categoryId} onChange={setCategoryId}>
          {categories.map((c) => (
            <List.Dropdown.Item key={c.id} title={c.name} value={c.id} />
          ))}
        </List.Dropdown>
      }
    >
      {Object.entries(groupBy(presets, (x) => x.appName))
        .filter(([section]) => Boolean(section))
        .map(([section, presets]) => (
          <List.Section key={section} title={section}>
            {presets?.map((preset) => (
              <List.Item
                key={preset.presetId}
                icon={preset.appIcon}
                title={preset.presetTitle}
                subtitle={preset.author}
                keywords={[preset.appName, ...preset.systemList]}
                accessories={[
                  ...preset.systemList.map((x) => ({ tag: { color: Color.Yellow, value: x } })),
                  { icon: Icon.Download, tag: { color: Color.Green, value: preset.download.toString() } },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      icon={Icon.Download}
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title={isDownloading ? "Downloading..." : "Download Preset"}
                      onAction={async () => {
                        if (isDownloading) return;
                        setIsDownloading(true);
                        const detail = await presetDetail(preset.presetId);
                        const destination = await downloadPreset(detail.fileS3);
                        setIsDownloading(false);
                        await showInFinder(destination);
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
