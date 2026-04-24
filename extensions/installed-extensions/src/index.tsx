import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { ExtensionTypeDropdown } from "./components/ExtensionTypeDropdown";
import { OpenManifestInDefaultAppAction } from "./components/OpenManifestInDefaultAppAction";
import {
  LIST_PAGE_SIZE,
  PARSE_CONCURRENCY,
  RECENTLY_UPDATED_WINDOW_MS,
  STAT_CONCURRENCY,
  extensionTypes,
} from "./helpers/constants";
import { getPackageJsonFiles, packageJsonMatchesExtensionFilter, parsePackageJson } from "./helpers/extension-scan";
import { ExtensionMetadata } from "./types";
import { formatItem, formatOutput, isWindows, mapInBatches } from "./helpers/utils";
import fs from "fs/promises";
import path from "path";

export default function IndexCommand() {
  const preferences = getPreferenceValues<Preferences.Index>();

  const [extensionTypeFilter, setExtensionTypeFilter] = useState("all");
  const [totalExtensionCount, setTotalExtensionCount] = useState(0);
  const orderedPathsRef = useRef<string[]>([]);
  const titleSortedMetadataRef = useRef<ExtensionMetadata[]>([]);

  const { isLoading, data, error, pagination } = useCachedPromise(
    (sortBy: Preferences.Index["sortBy"], extensionFilter: string) =>
      async ({ page }: { page: number }) => {
        if (page === 0) {
          orderedPathsRef.current = [];
          titleSortedMetadataRef.current = [];

          const files = await getPackageJsonFiles();
          const filteredPaths = files.filter((f) => packageJsonMatchesExtensionFilter(f, extensionFilter));
          setTotalExtensionCount(filteredPaths.length);

          if (filteredPaths.length === 0) {
            return { data: [] as ExtensionMetadata[], hasMore: false };
          }

          if (sortBy === "updated") {
            const withCtime = await mapInBatches(filteredPaths, STAT_CONCURRENCY, async (file) => {
              const st = await fs.stat(file);
              return { file, ctime: st.ctime.getTime() };
            });
            withCtime.sort((a, b) => b.ctime - a.ctime);
            orderedPathsRef.current = withCtime.map((x) => x.file);
          } else {
            const parsed = await mapInBatches(filteredPaths, PARSE_CONCURRENCY, parsePackageJson);
            let metas = parsed.filter(
              (item): item is ExtensionMetadata => item !== null && item.title !== "" && item.author !== "",
            );
            metas = metas.sort((a, b) => a.title.localeCompare(b.title));
            titleSortedMetadataRef.current = metas;
          }
        }

        if (sortBy === "updated") {
          const ordered = orderedPathsRef.current;
          if (ordered.length === 0) {
            return { data: [] as ExtensionMetadata[], hasMore: false };
          }
          const start = page * LIST_PAGE_SIZE;
          const slice = ordered.slice(start, start + LIST_PAGE_SIZE);
          const parsed = await mapInBatches(slice, PARSE_CONCURRENCY, parsePackageJson);
          const pageData = parsed.filter(
            (item): item is ExtensionMetadata => item !== null && item.title !== "" && item.author !== "",
          );
          return { data: pageData, hasMore: start + LIST_PAGE_SIZE < ordered.length };
        }

        const ordered = titleSortedMetadataRef.current;
        if (ordered.length === 0) {
          return { data: [] as ExtensionMetadata[], hasMore: false };
        }
        const start = page * LIST_PAGE_SIZE;
        const pageData = ordered.slice(start, start + LIST_PAGE_SIZE);
        return { data: pageData, hasMore: start + LIST_PAGE_SIZE < ordered.length };
      },
    [preferences.sortBy, extensionTypeFilter],
  );

  const installedExtensions = data ?? [];

  const sectionSubtitle =
    totalExtensionCount > 0
      ? `${installedExtensions.length} / ${totalExtensionCount}`
      : `${installedExtensions.length}`;

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <ExtensionTypeDropdown extensionTypes={extensionTypes} onExtensionTypeChange={setExtensionTypeFilter} />
      }
    >
      <List.EmptyView
        title={error ? "An Error Occurred" : "No Results"}
        icon={error ? { source: Icon.Warning, tintColor: Color.Red } : "noview.png"}
      />

      <List.Section title="Installed Extensions" subtitle={sectionSubtitle}>
        {installedExtensions &&
          installedExtensions.map((item: ExtensionMetadata) => {
            const accessories = [];
            if (item.isLocalExtension) {
              accessories.push({
                tag: { color: Color.Green, value: "Local extension" },
                icon: Icon.HardDrive,
              });
            }

            if (item.owner) {
              accessories.push({ tag: item.owner, icon: Icon.Crown, tooltip: "Organization" });
            } else {
              accessories.push({ tag: item.author, icon: Icon.Person, tooltip: "Author" });
            }

            if (item.owner && item.access === undefined) {
              accessories.push({
                tag: { color: Color.Red, value: "Private" },
                icon: Icon.EyeDisabled,
                tooltip: "Private Extension",
              });
            }

            const isRecentlyUpdated = Date.now() - item.updatedAt.getTime() < RECENTLY_UPDATED_WINDOW_MS;

            if (isRecentlyUpdated) {
              accessories.push({
                tag: { color: Color.Yellow, value: "Just Updated" },
                icon: Icon.Stars,
                tooltip: `Updated ${item.updatedAt.toLocaleString()}`,
              });
            }

            accessories.push({ tag: `${item.commandCount}`, icon: Icon.ComputerChip, tooltip: "Commands" });
            accessories.push({ date: item.updatedAt, tooltip: `Last updated: ${item.updatedAt.toLocaleString()}` });

            return (
              <List.Item
                key={item.path}
                icon={path.join(item.path, "assets", item.icon)}
                title={item.title}
                keywords={[item.author]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Extension">
                      <Action
                        icon={Icon.Play}
                        title="Launch Extension"
                        onAction={() => {
                          open(`raycast://extensions/${item.handle}`);
                        }}
                      />
                      <Action.OpenInBrowser url={item.link} />
                      <Action.CopyToClipboard
                        title="Copy Item to Clipboard"
                        content={formatItem(item, preferences.format)}
                        shortcut={{
                          macOS: { modifiers: ["cmd"], key: "." },
                          Windows: { modifiers: ["ctrl"], key: "." },
                        }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Extension List to Clipboard"
                        content={formatOutput(
                          installedExtensions,
                          preferences.format,
                          preferences.separator,
                          preferences.prepend,
                        )}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "." },
                          Windows: { modifiers: ["ctrl", "shift"], key: "." },
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <OpenManifestInDefaultAppAction url={path.join(item.path, "package.json")} />
                      <Action
                        title={isWindows ? "Show in Explorer" : "Show in Finder"}
                        icon={Icon.Folder}
                        onAction={() => open(item.path)}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "f" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "f" },
                        }}
                      />
                    </ActionPanel.Section>
                    <Action
                      title="Open Extension Preferences"
                      onAction={openExtensionPreferences}
                      icon={Icon.Gear}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "," },
                        Windows: { modifiers: ["ctrl", "shift"], key: "," },
                      }}
                    />
                  </ActionPanel>
                }
                accessories={accessories}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
