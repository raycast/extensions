import { ActionPanel, List, Action, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { $fetch } from "ofetch";
import type { Module, ApiResponse } from "./types/modules.ts";

export default function Command() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModules() {
      try {
        const response = await $fetch<ApiResponse>("https://api.nuxt.com/modules");
        setModules(response.modules);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching modules:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch modules",
          message: String(error),
        });
        setIsLoading(false);
      }
    }

    fetchModules();
  }, []);

  const categories = Array.from(new Set(modules.map((module) => module.category).filter(Boolean)));

  const filteredModules = modules.filter((module) => {
    const matchesSearchText =
      !searchText ||
      module.name.toLowerCase().includes(searchText.toLowerCase()) ||
      module.description.toLowerCase().includes(searchText.toLowerCase()) ||
      module.npm.toLowerCase().includes(searchText.toLowerCase());

    const matchesCategory = !selectedCategory || module.category === selectedCategory;

    return matchesSearchText && matchesCategory;
  });

  const sortedModules = [...filteredModules].sort((a, b) => a.name.localeCompare(b.name));

  async function copyInstallCommand(npmPackage: string) {
    const command = `npx nuxi module add ${npmPackage}`;
    await Clipboard.copy(command);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: command,
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Nuxt modules..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" value={selectedCategory || ""} onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All Categories" value="" />
          {categories.map((category) => (
            <List.Dropdown.Item key={category} title={category || ""} value={category || ""} />
          ))}
        </List.Dropdown>
      }
    >
      {sortedModules.map((module) => {
        return (
          <List.Item
            key={module.npm}
            icon={moduleImage(module.icon) || { source: Icon.Box }}
            title={module.name}
            subtitle={module.description}
            accessories={[{ text: module.category || "" }, { text: module.npm }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Install Command"
                  icon={{ source: Icon.CopyClipboard }}
                  onAction={() => copyInstallCommand(module.name)}
                />
                {module.github && (
                  <Action.OpenInBrowser
                    title="Open GitHub Repository"
                    url={module.github}
                    icon={{ source: Icon.Globe }}
                  />
                )}
                {module.website && (
                  <Action.OpenInBrowser title="Open Website" url={module.website} icon={{ source: Icon.Globe }} />
                )}
                <ActionPanel.Section title="Package Managers">
                  <Action
                    title="Copy Bun Command"
                    icon={{ source: Icon.CopyClipboard }}
                    onAction={() => Clipboard.copy(`bun add ${module.npm}`)}
                  />
                  <Action
                    title="Copy Pnpm Command"
                    icon={{ source: Icon.CopyClipboard }}
                    onAction={() => Clipboard.copy(`pnpm add ${module.npm}`)}
                  />
                  <Action
                    title="Copy Yarn Command"
                    icon={{ source: Icon.CopyClipboard }}
                    onAction={() => Clipboard.copy(`yarn add ${module.npm}`)}
                  />
                  <Action
                    title="Copy npm Command"
                    icon={{ source: Icon.CopyClipboard }}
                    onAction={() => Clipboard.copy(`npm i ${module.npm}`)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export const moduleImage = function (icon: string = "", size: number = 80) {
  if (!icon) return;

  if (/^http(s)?:\/\//.test(icon)) return icon;

  if (/\.svg$/.test(icon)) return `https://raw.githubusercontent.com/nuxt/modules/main/icons/${icon}`;

  return `https://ipx.nuxt.com/s_${size},f_auto/gh/nuxt/modules/main/icons/${icon}`;
};
