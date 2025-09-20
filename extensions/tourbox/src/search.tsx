import { Action, ActionPanel, Color, Icon, List, showInFinder } from "@raycast/api";
import groupBy from "lodash/groupBy.js";
import { useEffect, useState } from "react";
import { allCategory, allPreset, downloadPreset } from "./api.js";
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
            <List.Dropdown.Item key={c.id} title={c.name} value={c.categoryId} />
          ))}
        </List.Dropdown>
      }
    >
      {Object.entries(groupBy(presets, (x) => x.applicationName))
        .filter(([section]) => Boolean(section))
        .map(([section, presets]) => (
          <List.Section key={section} title={section}>
            {presets?.map((preset) => (
              <List.Item
                key={preset.id}
                title={preset.title}
                subtitle={preset.author}
                keywords={[preset.applicationName, ...preset.sysName.split("/"), ...preset.nameArr]}
                accessories={[
                  ...preset.sysName.split("/").map((x) => ({ tag: { color: Color.Yellow, value: x } })),
                  ...preset.nameArr.map((x) => ({ tag: { color: Color.Blue, value: x } })),
                  { icon: Icon.Download, tag: { color: Color.Green, value: preset.downloadNum.toString() } },
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
                        const destination = await downloadPreset(preset.filePath);
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
