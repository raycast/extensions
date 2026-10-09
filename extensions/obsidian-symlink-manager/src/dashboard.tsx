import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { useState } from "react";
import {
  deleteNativeItem,
  detachItem,
  pullCopyItem,
  pullItem,
  pushItem,
  scanItems,
  unlinkItem,
  type ItemCategory,
  type ItemState,
  type VaultItem,
} from "./lib/items";
import { ensureGitRepo } from "./lib/git";
import {
  getSnippetFolderMode,
  restoreSnippetFolder,
  switchToWholeSnippetFolder,
  type SnippetFolderMode,
} from "./lib/snippet-folder";
import { getRegisteredVaults, getSelectedVault, registerVault, removeVault, setSelectedVault } from "./lib/storage";
import ItemInspector from "./inspector";
import CoreSettings from "./core-settings";
import { categoryOverviewVisual } from "./lib/inspector-visuals";
import { generateThemePreviewSvg } from "./lib/theme-preview";
import { useVaultRefresh } from "./lib/use-vault-refresh";

const execFileAsync = promisify(execFile);

async function isVaultDirectory(vaultPath: string): Promise<boolean> {
  if (!isAbsolute(vaultPath)) return false;
  try {
    const [vault, configuration] = await Promise.all([lstat(vaultPath), lstat(join(vaultPath, ".obsidian"))]);
    return vault.isDirectory() && configuration.isDirectory();
  } catch {
    return false;
  }
}

interface VaultCandidate {
  path: string;
  valid: boolean;
  open: boolean;
  discovered: boolean;
  registered: boolean;
}

/** Obsidian's registry lists known vaults, but its open flag does not identify the frontmost window. */
async function getObsidianVaults(): Promise<{ path: string; open: boolean }[]> {
  try {
    const registryPath = join(homedir(), "Library", "Application Support", "obsidian", "obsidian.json");
    const parsed: unknown = JSON.parse(await readFile(registryPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !("vaults" in parsed)) return [];
    const vaults = parsed.vaults;
    if (!vaults || typeof vaults !== "object" || Array.isArray(vaults)) return [];
    return Object.values(vaults).flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      if (!("path" in entry) || typeof entry.path !== "string" || !isAbsolute(entry.path)) return [];
      return [{ path: resolve(entry.path), open: "open" in entry && entry.open === true }];
    });
  } catch {
    // Obsidian may not be installed, or its registry format may change.
  }
  return [];
}

async function getVaultCandidates(defaultVault: string): Promise<VaultCandidate[]> {
  const registered = await getRegisteredVaults();
  const discovered = await getObsidianVaults();
  const candidates = new Map<string, Omit<VaultCandidate, "valid">>();
  for (const entry of discovered) {
    if (entry.path === resolve(defaultVault)) continue;
    const previous = candidates.get(entry.path);
    candidates.set(entry.path, {
      path: entry.path,
      open: entry.open || previous?.open === true,
      discovered: true,
      registered: previous?.registered === true,
    });
  }
  for (const entry of registered) {
    const vaultPath = resolve(entry);
    if (vaultPath === resolve(defaultVault)) continue;
    const previous = candidates.get(vaultPath);
    candidates.set(vaultPath, {
      path: vaultPath,
      open: previous?.open === true,
      discovered: previous?.discovered === true,
      registered: true,
    });
  }
  const checked = await Promise.all(
    [...candidates.values()].map(async (candidate) => ({
      ...candidate,
      valid: await isVaultDirectory(candidate.path),
    })),
  );
  return checked.filter((candidate) => candidate.valid);
}

async function getValidVaults(defaultVault: string): Promise<string[]> {
  return (await getVaultCandidates(defaultVault))
    .filter((candidate) => candidate.valid)
    .map((candidate) => candidate.path);
}

/** Ask Obsidian for its active vault without requiring Accessibility permissions. */
async function detectActiveObsidianVault(): Promise<string | undefined> {
  const executables = [
    join("/Applications", "Obsidian.app", "Contents", "MacOS", "obsidian"),
    join(homedir(), "Applications", "Obsidian.app", "Contents", "MacOS", "obsidian"),
    "obsidian",
  ];
  for (const executable of executables) {
    try {
      const { stdout } = await execFileAsync(executable, ["vault", "info=path"], {
        cwd: "/",
        timeout: 3000,
      });
      const lines = stdout.trim().split(/\r?\n/);
      const activePath = lines
        .reverse()
        .find((line) => isAbsolute(line.trim()))
        ?.trim();
      if (!activePath) continue;
      if (await isVaultDirectory(activePath)) return resolve(activePath);
    } catch {
      // An older Obsidian version or a different install location may lack the CLI.
    }
  }
  return undefined;
}

const categories: { key: ItemCategory; title: string; icon: string }[] = [
  { key: "plugins", title: "Plugins", icon: "🧩" },
  { key: "themes", title: "Themes", icon: "🎨" },
  { key: "snippets", title: "CSS Snippets", icon: "📝" },
  { key: "settings", title: "Core Settings", icon: "⚙️" },
];

const states: Record<ItemState, { label: string; color: Color }> = {
  linked: { label: "LINKED", color: Color.Green },
  "native-unique": { label: "TARGET ONLY", color: Color.SecondaryText },
  "native-identical": { label: "MATCHING COPY", color: Color.Purple },
  "native-branched": { label: "DIFFERENT", color: Color.Orange },
  available: { label: "AVAILABLE", color: Color.Blue },
  broken: { label: "BROKEN", color: Color.Red },
  "foreign-link": { label: "FOREIGN LINK", color: Color.Red },
};

const stateSections: { state: ItemState; title: string; description: string }[] = [
  { state: "broken", title: "Broken Links", description: "The expected Default Vault source is missing" },
  { state: "foreign-link", title: "Foreign Links", description: "The link points somewhere unexpected" },
  {
    state: "native-branched",
    title: "Different Copies",
    description: "Both vaults have independent, differing copies",
  },
  { state: "native-unique", title: "Target Only", description: "Exists here, but not in the Default Vault" },
  {
    state: "native-identical",
    title: "Matching Copies",
    description: "Also in Default Vault; the copies are not linked",
  },
  { state: "linked", title: "Linked", description: "Uses the Default Vault item" },
  { state: "available", title: "Available to Link", description: "Only in the Default Vault" },
];

type StatusFilter = "all" | "available" | "linked" | "review" | "local";
const STATUS_FILTERS: StatusFilter[] = ["all", "review", "local", "linked", "available"];

function availableStatusFilters(items: VaultItem[]): StatusFilter[] {
  const available = STATUS_FILTERS.filter((filter) => items.filter((item) => matchesFilter(item, filter)).length > 0);
  return available.length > 0 ? available : ["all"];
}

function cycleFilter(filter: StatusFilter, direction: 1 | -1, availableFilters: StatusFilter[]): StatusFilter {
  const currentIndex = STATUS_FILTERS.indexOf(filter);
  for (let offset = 1; offset <= STATUS_FILTERS.length; offset++) {
    const index = (currentIndex + direction * offset + STATUS_FILTERS.length * 2) % STATUS_FILTERS.length;
    const candidate = STATUS_FILTERS[index];
    if (availableFilters.includes(candidate)) return candidate;
  }
  return "all";
}

function StatusFilterActions({
  filter,
  availableFilters,
  onChange,
}: {
  filter: StatusFilter;
  availableFilters: StatusFilter[];
  onChange: (next: StatusFilter) => void;
}) {
  const current = filter === "local" ? "Local" : filter[0].toUpperCase() + filter.slice(1);
  return (
    <ActionPanel.Section title="Status Filter">
      <Action
        title={`Next Filter (${current})`}
        shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
        onAction={() => onChange(cycleFilter(filter, 1, availableFilters))}
      />
      <Action
        title={`Previous Filter (${current})`}
        shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
        onAction={() => onChange(cycleFilter(filter, -1, availableFilters))}
      />
    </ActionPanel.Section>
  );
}

function isReview(state: ItemState): boolean {
  return state === "native-branched" || state === "broken" || state === "foreign-link";
}

function isLocal(state: ItemState): boolean {
  return state === "native-unique" || state === "native-identical";
}

function matchesFilter(item: VaultItem, filter: StatusFilter): boolean {
  switch (filter) {
    case "available":
    case "linked":
      return item.state === filter;
    case "review":
      return isReview(item.state);
    case "local":
      return isLocal(item.state);
    default:
      return true;
  }
}

function summary(items: VaultItem[]): string {
  const counts = {
    available: items.filter((item) => item.state === "available").length,
    review: items.filter((item) => isReview(item.state)).length,
    linked: items.filter((item) => item.state === "linked").length,
    local: items.filter((item) => isLocal(item.state)).length,
  };
  const parts = [
    counts.review ? `${counts.review} to review` : "",
    counts.local ? `${counts.local} local` : "",
    counts.linked ? `${counts.linked} linked` : "",
    counts.available ? `${counts.available} available` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No items yet";
}

function escapeMarkdown(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("`", "\\`")
    .replaceAll("<", "&lt;");
}

function categoryOverviewMarkdown(
  category: (typeof categories)[number],
  items: VaultItem[],
  snippetFolderMode?: string,
  visualPath?: string,
  themePreviews?: { item: VaultItem; path: string | undefined }[],
): string {
  const categoryItems = items.filter((item) => item.category === category.key);

  if (visualPath && (category.key === "plugins" || category.key === "snippets" || category.key === "themes")) {
    const blocks = [`# ${category.title}`];

    if (category.key === "themes" && themePreviews) {
      const validPreviews = themePreviews.filter((p) => p.path);
      if (validPreviews.length > 0) {
        if (validPreviews.length === 1) {
          blocks.push(`## Preview · ${validPreviews[0].item.name}`);
          blocks.push(`![Preview of ${validPreviews[0].item.name}](<${validPreviews[0].path}>)`);
        } else {
          blocks.push(`## Previews`);
          for (const p of validPreviews) {
            blocks.push(`### ${p.item.name}`);
            blocks.push(`![Preview of ${p.item.name}](<${p.path}>)`);
          }
        }
      }
    }

    blocks.push(`![${category.title} presence in each vault](<${visualPath}>)`);

    return blocks.join("\n\n");
  }
  return [
    `# ${category.title}`,
    ...(visualPath ? [`![${category.title} overview](<${visualPath}>)`] : []),
    ...(category.key === "snippets" && snippetFolderMode === "whole-folder"
      ? [
          "The full snippets folder is linked to the Default Vault. Individual CSS files are not listed while this link is active.",
        ]
      : category.key === "snippets" && snippetFolderMode === "restore-available"
        ? ["The full snippets folder is linked, and the previous target setup is saved for restoration."]
        : []),
    ...(category.key === "settings"
      ? [
          "Browse individual settings, compare their values, and choose which vault's value to use. Entire-file controls are available inside the settings view.",
        ]
      : []),
    summary(categoryItems),
    ...stateSections.flatMap(({ state, title, description }) => {
      const groupItems = categoryItems.filter((item) => item.state === state);
      return groupItems.length
        ? [
            `## ${title} (${groupItems.length})`,
            description,
            groupItems.map((item) => `- ${escapeMarkdown(item.name)}`).join("\n"),
          ]
        : [];
    }),
  ].join("\n\n");
}

function customizedKey(item: VaultItem): string {
  return `customized:${item.targetVault}:${item.id}`;
}

async function restartObsidian(): Promise<void> {
  await execFileAsync("osascript", [
    "-e",
    'tell application "Obsidian" to quit',
    "-e",
    "delay 1",
    "-e",
    'tell application "Obsidian" to activate',
  ]);
}

async function runAction(title: string, action: () => Promise<void>, onDone: () => void): Promise<void> {
  try {
    await action();
    await showToast({ style: Toast.Style.Success, title });
    onDone();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: `${title} failed`, message: String(error) });
  }
}

async function confirmDestructive(title: string, message: string): Promise<boolean> {
  return confirmAlert({
    title,
    message,
    primaryAction: { title: "Continue", style: Alert.ActionStyle.Destructive },
  });
}

function GlobalActions({ defaultVault, onRefresh }: { defaultVault: string; onRefresh: () => void }) {
  const { push } = useNavigation();

  return (
    <ActionPanel.Section title="Global">
      <Action
        title="Manage Vaults"
        icon={Icon.Folder}
        onAction={() => push(<VaultList defaultVault={defaultVault} />)}
      />
      <Action
        title="Restart Obsidian"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
        onAction={() => void runAction("Obsidian restarted", restartObsidian, onRefresh)}
      />
    </ActionPanel.Section>
  );
}

function ItemActions({
  item,
  isCustomized,
  onRefresh,
  onCustomize,
  allItems,
  filter,
  onFilterChange,
}: {
  item: VaultItem;
  isCustomized: boolean;
  onRefresh: () => void;
  onCustomize: () => void;
  allItems: VaultItem[];
  filter: StatusFilter;
  onFilterChange: (next: StatusFilter) => void;
}) {
  const { push, pop } = useNavigation();
  const canPush =
    item.category !== "settings" &&
    (item.state === "native-unique" || item.state === "native-identical" || item.state === "native-branched");
  const canPull =
    item.category !== "settings" &&
    (item.state === "available" || item.state === "native-identical" || item.state === "native-branched");
  const replacesNative = item.state === "native-identical" || item.state === "native-branched";
  const folderTitle = categories.find(({ key }) => key === item.category)?.title ?? item.category;

  const quickActions = (
    <>
      {canPull && (
        <Action
          title={replacesNative ? "Pull from Default Vault (Overwrite Local)" : "Pull from Default Vault"}
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() =>
            void (async () => {
              if (
                replacesNative &&
                !(await confirmDestructive(
                  "Replace native item?",
                  `The local ${item.name} will be replaced with a symlink.`,
                ))
              )
                return;
              await runAction("Pulled from Default Vault", () => pullItem(item, replacesNative), onRefresh);
            })()
          }
        />
      )}
      {canPush && (
        <Action
          title={
            item.state === "native-unique"
              ? "Push to Default Vault (Move & Symlink)"
              : "Push to Default Vault (Overwrite)"
          }
          icon={Icon.ArrowUp}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() =>
            void (async () => {
              if (
                !(await confirmDestructive(
                  "Push this native item?",
                  item.state === "native-unique"
                    ? `${item.name} will move to the Default Vault and become a symlink here.`
                    : `The Default Vault's ${item.name} will be replaced with this vault's copy.`,
                ))
              )
                return;
              await runAction("Pushed to Default Vault", () => pushItem(item, true), onRefresh);
            })()
          }
        />
      )}
      {canPull && (
        <Action
          title={replacesNative ? "Pull Copy from Default (Overwrite Local)" : "Pull Copy from Default"}
          icon={Icon.Document}
          onAction={() =>
            void (async () => {
              if (
                replacesNative &&
                !(await confirmDestructive(
                  "Replace this vault's copy?",
                  `${item.name} in ${basename(item.targetVault)} will be replaced with an independent copy from the Default Vault.`,
                ))
              )
                return;
              await runAction("Copied from Default Vault", () => pullCopyItem(item, replacesNative), onRefresh);
            })()
          }
        />
      )}
      {item.state === "linked" && (
        <Action
          title="Detach (Keep a Native Copy)"
          icon={Icon.Document}
          onAction={() => void runAction("Detached item", () => detachItem(item), onRefresh)}
        />
      )}
      {(item.state === "linked" || item.state === "broken") && (
        <Action
          title="Unlink Item"
          icon={Icon.Trash}
          onAction={() =>
            void (async () => {
              if (!(await confirmDestructive("Unlink item?", `Remove the symlink for ${item.name} from this vault?`)))
                return;
              await runAction("Unlinked item", () => unlinkItem(item, true), onRefresh);
            })()
          }
        />
      )}
      {(item.state === "native-unique" || item.state === "native-branched" || item.state === "native-identical") && (
        <Action
          title={isCustomized ? "Remove Customized Mark" : "Mark as Customized"}
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          onAction={onCustomize}
        />
      )}
      {item.state === "native-unique" && (
        <Action
          title="Delete Native Item"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={() =>
            void (async () => {
              if (
                !(await confirmDestructive(
                  "Delete native item?",
                  `${item.name} will be permanently removed from this vault.`,
                ))
              )
                return;
              await runAction("Deleted native item", () => deleteNativeItem(item, true), onRefresh);
            })()
          }
        />
      )}
      {item.state === "foreign-link" && (
        <Action
          title="Inspect Foreign Link"
          icon={Icon.Eye}
          onAction={() => push(<ItemInspector item={item} onChanged={onRefresh} />)}
        />
      )}
    </>
  );

  return (
    <ActionPanel>
      <ActionPanel.Section title="Inspect">
        <Action
          title="Open Item Inspector"
          icon={Icon.Eye}
          onAction={() => push(<ItemInspector item={item} onChanged={onRefresh} />)}
        />
        <ActionPanel.Submenu title="Item Operations" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "return" }}>
          {quickActions}
        </ActionPanel.Submenu>
        <Action.ShowInFinder
          title={`Open ${folderTitle} Folder in Finder`}
          path={join(item.targetVault, ".obsidian", ...(item.category === "settings" ? [] : [item.category]))}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Quick Actions">{quickActions}</ActionPanel.Section>
      <ActionPanel.Section title="Navigation">
        <Action title="Back to Overview" onAction={pop} />
      </ActionPanel.Section>
      <StatusFilterActions
        filter={filter}
        availableFilters={availableStatusFilters(allItems.filter((candidate) => candidate.category === item.category))}
        onChange={onFilterChange}
      />
      <GlobalActions defaultVault={item.defaultVault} onRefresh={onRefresh} />
    </ActionPanel>
  );
}

function SnippetFolderActions({
  mode,
  defaultVault,
  targetVault,
  onChanged,
}: {
  mode?: SnippetFolderMode;
  defaultVault: string;
  targetVault: string;
  onChanged: () => void;
}) {
  if (mode !== "individual" && mode !== "missing" && mode !== "restore-available") return null;
  return (
    <ActionPanel.Section title="CSS Snippets Folder">
      {mode === "restore-available" ? (
        <Action
          title="Restore Previous CSS Snippets Setup"
          icon={Icon.ArrowCounterClockwise}
          onAction={() =>
            void (async () => {
              if (
                !(await confirmAlert({
                  title: "Restore previous snippets setup?",
                  message:
                    "The shared folder link will be removed and the saved target snippets folder will be restored. Changes made through the shared folder will remain in the Default Vault.",
                  primaryAction: { title: "Restore Setup" },
                }))
              )
                return;
              await runAction(
                "Restored previous snippets setup",
                () => restoreSnippetFolder(defaultVault, targetVault),
                onChanged,
              );
            })()
          }
        />
      ) : (
        <Action
          title="Link Entire CSS Snippets Folder"
          icon={Icon.Link}
          onAction={() =>
            void (async () => {
              if (
                !(await confirmAlert({
                  title: "Link entire CSS snippets folder?",
                  message:
                    mode === "individual"
                      ? "The current target snippets folder will be moved to a backup beside it. The target will then link to the Default Vault snippets folder. You can restore the saved folder later."
                      : "The target has no snippets folder. An empty backup folder will be saved, and the target will link to the Default Vault snippets folder. You can restore the empty folder later.",
                  primaryAction: { title: "Link Folder" },
                }))
              )
                return;
              await runAction(
                "Linked entire CSS snippets folder",
                () => switchToWholeSnippetFolder(defaultVault, targetVault),
                onChanged,
              );
            })()
          }
        />
      )}
    </ActionPanel.Section>
  );
}

export function VaultDashboard({ defaultVault, targetVault }: { defaultVault: string; targetVault: string }) {
  const { push } = useNavigation();
  const [activeTarget, setActiveTarget] = useState(targetVault);
  const {
    data: scan,
    isLoading: scanning,
    error: scanError,
    revalidate,
  } = usePromise(
    async (origin: string, target: string) => {
      const [items, mode] = await Promise.all([
        scanItems(origin, target),
        getSnippetFolderMode(origin, target).catch(() => undefined),
      ]);
      const [plugins, snippets, themes] = await Promise.all([
        categoryOverviewVisual("plugins", items, origin, target).catch(() => undefined),
        categoryOverviewVisual("snippets", items, origin, target, mode).catch(() => undefined),
        categoryOverviewVisual("themes", items, origin, target).catch(() => undefined),
      ]);
      const themeItems = items.filter((i) => i.category === "themes");
      const themePreviews = await Promise.all(
        themeItems.map(async (item) => ({ item, path: await generateThemePreviewSvg(item).catch(() => undefined) })),
      );
      return { target, items, snippetMode: mode, visuals: { plugins, snippets, themes, themePreviews } };
    },
    [defaultVault, activeTarget],
  );
  const isLoading = scanning || (!scanError && scan?.target !== activeTarget);
  const items = scan?.target === activeTarget ? scan.items : [];
  const overviewSnippetMode = scan?.target === activeTarget ? scan.snippetMode : undefined;
  const { data: snippetFolderMode, revalidate: revalidateSnippetFolderMode } = usePromise(getSnippetFolderMode, [
    defaultVault,
    activeTarget,
  ]);
  useVaultRefresh(defaultVault, activeTarget, () => {
    void revalidate();
    void revalidateSnippetFolderMode();
  });
  const { data: vaults = [] } = usePromise(getValidVaults, [defaultVault]);
  const dropdownVaults = vaults.includes(activeTarget) ? vaults : [activeTarget, ...vaults];
  const openCategory = (category: (typeof categories)[number]) =>
    push(
      category.key === "settings" ? (
        <CoreSettings defaultVault={defaultVault} targetVault={activeTarget} onChanged={revalidate} />
      ) : (
        <CategoryItemList
          category={category}
          defaultVault={defaultVault}
          targetVault={activeTarget}
          onChanged={revalidate}
        />
      ),
    );

  return (
    <List
      navigationTitle={`${basename(activeTarget)} · Obsidian Symlink Manager`}
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search categories..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Target Vault"
          value={activeTarget}
          onChange={(vaultPath) => {
            setActiveTarget(vaultPath);
            void setSelectedVault(vaultPath);
          }}
        >
          {dropdownVaults.map((vaultPath) => (
            <List.Dropdown.Item key={vaultPath} title={basename(vaultPath)} value={vaultPath} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Categories">
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category.key);
          const visualPath =
            scan?.target === activeTarget
              ? category.key === "plugins"
                ? scan.visuals.plugins
                : category.key === "snippets"
                  ? scan.visuals.snippets
                  : category.key === "themes"
                    ? scan.visuals.themes
                    : undefined
              : undefined;
          return (
            <List.Item
              key={category.key}
              title={category.title}
              icon={category.icon}
              subtitle={
                category.key === "settings"
                  ? "Browse individual settings"
                  : category.key === "snippets" && snippetFolderMode === "whole-folder"
                    ? "Entire CSS snippets folder linked"
                    : category.key === "snippets" && snippetFolderMode === "restore-available"
                      ? "Full folder link · previous setup saved"
                      : `${categoryItems.length} items`
              }
              detail={
                <List.Item.Detail
                  markdown={
                    scanError
                      ? `# Could not scan this vault\n\n${String(scanError)}`
                      : categoryOverviewMarkdown(
                          category,
                          items,
                          overviewSnippetMode ?? snippetFolderMode,
                          visualPath,
                          scan?.visuals?.themePreviews,
                        )
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action title={`Open ${category.title}`} onAction={() => openCategory(category)} />
                  <Action.ShowInFinder
                    title={`Open ${category.title} Folder in Finder`}
                    path={join(activeTarget, ".obsidian", ...(category.key === "settings" ? [] : [category.key]))}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  {category.key === "snippets" && (
                    <SnippetFolderActions
                      mode={snippetFolderMode}
                      defaultVault={defaultVault}
                      targetVault={activeTarget}
                      onChanged={() => {
                        void revalidate();
                        void revalidateSnippetFolderMode();
                      }}
                    />
                  )}
                  <Action title="Manage Vaults" onAction={() => push(<VaultList defaultVault={defaultVault} />)} />
                  <GlobalActions defaultVault={defaultVault} onRefresh={revalidate} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function CategoryItemList({
  category,
  defaultVault,
  targetVault,
  onChanged,
}: {
  category: (typeof categories)[number];
  defaultVault: string;
  targetVault: string;
  onChanged: () => Promise<unknown> | void;
}) {
  const { pop } = useNavigation();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const {
    data: items = [],
    isLoading,
    error: scanError,
    revalidate,
  } = usePromise(scanItems, [defaultVault, targetVault]);
  const { data: snippetFolderMode, revalidate: revalidateSnippetFolderMode } = usePromise(getSnippetFolderMode, [
    defaultVault,
    targetVault,
  ]);
  useVaultRefresh(defaultVault, targetVault, () => {
    void revalidate();
    void revalidateSnippetFolderMode();
  });
  const categoryItems = items.filter((item) => item.category === category.key);
  const cycleFilters = availableStatusFilters(categoryItems);
  const visibleItems = categoryItems.filter((item) => matchesFilter(item, filter));
  const { data: customized = {}, revalidate: refreshCustomized } = usePromise(
    async (loadedItems: VaultItem[]) => {
      const entries = await Promise.all(
        loadedItems.map(
          async (item) => [item.id, (await LocalStorage.getItem<boolean>(customizedKey(item))) === true] as const,
        ),
      );
      return Object.fromEntries(entries) as Record<string, boolean>;
    },
    [items],
  );

  async function refreshItems() {
    await Promise.all([revalidate(), revalidateSnippetFolderMode(), onChanged()]);
  }

  async function toggleCustomized(item: VaultItem) {
    if (customized[item.id]) await LocalStorage.removeItem(customizedKey(item));
    else await LocalStorage.setItem(customizedKey(item), true);
    refreshCustomized();
  }

  return (
    <List
      navigationTitle={`${category.title} · ${basename(targetVault)}`}
      searchBarPlaceholder={`Search ${category.title.toLowerCase()}...`}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Status Filter · ⌘P"
          value={filter}
          onChange={(value) => setFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title={`All (${categoryItems.length})`} value="all" />
          <List.Dropdown.Item
            title={`Review (${categoryItems.filter((item) => isReview(item.state)).length})`}
            value="review"
          />
          <List.Dropdown.Item
            title={`Local (${categoryItems.filter((item) => isLocal(item.state)).length})`}
            value="local"
          />
          <List.Dropdown.Item
            title={`Linked (${categoryItems.filter((item) => item.state === "linked").length})`}
            value="linked"
          />
          <List.Dropdown.Item
            title={`Available (${categoryItems.filter((item) => item.state === "available").length})`}
            value="available"
          />
        </List.Dropdown>
      }
    >
      {category.key === "snippets" && !scanError && (
        <List.Section title="Entire Folder">
          <List.Item
            id="snippets-folder"
            icon={snippetFolderMode === "restore-available" ? Icon.ArrowCounterClockwise : Icon.Link}
            title={
              snippetFolderMode === "restore-available"
                ? "Restore Previous CSS Snippets Setup"
                : snippetFolderMode === "whole-folder"
                  ? "Entire CSS Snippets Folder Linked"
                  : "Link Entire CSS Snippets Folder"
            }
            subtitle={
              snippetFolderMode === "individual"
                ? "Save this vault's current snippets folder, then link the Default Vault folder"
                : snippetFolderMode === "missing"
                  ? "Create an empty backup, then link the Default Vault folder"
                  : snippetFolderMode === "restore-available"
                    ? "Replace the folder link with this vault's saved snippets folder"
                    : snippetFolderMode === "whole-folder"
                      ? "This vault uses the Default Vault snippets folder"
                      : "Check the Default Vault snippets folder and target path"
            }
            actions={
              <ActionPanel>
                <SnippetFolderActions
                  mode={snippetFolderMode}
                  defaultVault={defaultVault}
                  targetVault={targetVault}
                  onChanged={() => void refreshItems()}
                />
                <Action title="Back to Overview" onAction={pop} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!scanError &&
        stateSections.map(({ state: sectionState, title, description }) => {
          const sectionItems = visibleItems.filter((item) => item.state === sectionState);
          if (sectionItems.length === 0) return null;
          return (
            <List.Section key={sectionState} title={`${title} · ${sectionItems.length}`} subtitle={description}>
              {sectionItems.map((item) => {
                const state = states[item.state];
                return (
                  <List.Item
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    subtitle={customized[item.id] ? "Customized" : undefined}
                    accessories={[{ tag: { value: state.label, color: state.color } }]}
                    actions={
                      <ItemActions
                        item={item}
                        isCustomized={customized[item.id] === true}
                        onCustomize={() => void toggleCustomized(item)}
                        onRefresh={refreshItems}
                        allItems={items}
                        filter={filter}
                        onFilterChange={setFilter}
                      />
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
      {!isLoading && (scanError || (visibleItems.length === 0 && category.key !== "snippets")) && (
        <List.EmptyView
          title={
            scanError
              ? "Could not scan this vault"
              : filter === "all"
                ? `No ${category.title.toLowerCase()} found`
                : "No items match this filter"
          }
          description={
            scanError
              ? String(scanError)
              : filter === "all"
                ? "Add a supported item to either vault."
                : "Choose All to see every item."
          }
          actions={
            <ActionPanel>
              <Action title="Back to Overview" onAction={pop} />
              <StatusFilterActions filter={filter} availableFilters={cycleFilters} onChange={setFilter} />
              <GlobalActions defaultVault={defaultVault} onRefresh={refreshItems} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function AddVaultForm({ defaultVault, onAdded }: { defaultVault: string; onAdded: (path: string) => void }) {
  const { pop } = useNavigation();
  const [path, setPath] = useState("");
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle="Register Obsidian Vault"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Register Vault"
            onSubmit={() =>
              void (async () => {
                try {
                  const enteredPath = path.trim();
                  if (!enteredPath || !isAbsolute(enteredPath)) {
                    setError("Enter an absolute path to an existing Obsidian vault.");
                    return;
                  }
                  const selectedPath = resolve(enteredPath);
                  if (selectedPath === resolve(defaultVault)) {
                    setError("The target must be different from the Default Vault.");
                    return;
                  }
                  if (!(await isVaultDirectory(selectedPath))) {
                    setError("This folder must contain a real .obsidian directory.");
                    return;
                  }
                  await registerVault(selectedPath);
                  await setSelectedVault(selectedPath);
                  pop();
                  onAdded(selectedPath);
                } catch (cause) {
                  setError(String(cause));
                }
              })()
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="path"
        title="Vault Path"
        placeholder="/Users/you/Documents/Obsidian/My Vault"
        value={path}
        onChange={(value) => {
          setPath(value);
          setError(undefined);
        }}
        error={error}
      />
      <Form.Description text="Select an existing Obsidian vault. The manager reads configuration from its .obsidian folder." />
    </Form>
  );
}

export function VaultList({ defaultVault, explanation }: { defaultVault: string; explanation?: string }) {
  const { push } = useNavigation();
  const { data: vaults = [], isLoading, revalidate } = usePromise(getVaultCandidates, [defaultVault]);

  function showAddVaultForm() {
    push(
      <AddVaultForm
        defaultVault={defaultVault}
        onAdded={(path) => push(<VaultDashboard defaultVault={defaultVault} targetVault={path} />)}
      />,
    );
  }

  return (
    <List navigationTitle="Obsidian Vaults" isLoading={isLoading} searchBarPlaceholder="Search vaults...">
      <List.Section title="Default Vault">
        <List.Item
          title={basename(defaultVault)}
          subtitle={defaultVault}
          icon="🏠"
          actions={
            <ActionPanel>
              <Action title="Register Vault Manually" icon={Icon.Plus} onAction={showAddVaultForm} />
              <Action title="Refresh Vaults" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section
        title="Choose a Target Vault"
        subtitle={explanation ?? "Select a vault to compare with the Default Vault"}
      >
        {vaults
          .filter(({ path }) => resolve(path) !== resolve(defaultVault))
          .map(({ path, open, discovered, registered }) => (
            <List.Item
              key={path}
              title={basename(path)}
              subtitle={path}
              icon={Icon.Folder}
              accessories={open ? [{ text: "Open in Obsidian" }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Vault Dashboard"
                    onAction={() => {
                      void setSelectedVault(path);
                      push(<VaultDashboard defaultVault={defaultVault} targetVault={path} />);
                    }}
                  />
                  <Action title="Register Another Vault" icon={Icon.Plus} onAction={showAddVaultForm} />
                  {registered && !discovered && (
                    <Action
                      title="Remove Vault from List"
                      icon={Icon.Trash}
                      onAction={() =>
                        void (async () => {
                          await removeVault(path);
                          revalidate();
                        })()
                      }
                    />
                  )}
                  <Action title="Refresh Vaults" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      {!isLoading && vaults.length === 0 && (
        <List.EmptyView
          title="No target vaults found"
          description="Open a vault in Obsidian or register one manually to inspect its configuration."
          actions={
            <ActionPanel>
              <Action title="Register Vault" icon={Icon.Plus} onAction={showAddVaultForm} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default function Dashboard() {
  const { defaultVaultPath } = getPreferenceValues<{ defaultVaultPath?: string }>();
  const { data: validDefaultVault, isLoading: checkingDefaultVault } = usePromise(
    isVaultDirectory,
    [defaultVaultPath ?? ""],
    {
      execute: Boolean(defaultVaultPath?.trim()),
    },
  );
  usePromise(ensureGitRepo, [defaultVaultPath ?? ""], { execute: validDefaultVault === true });
  const { data: selection, isLoading: choosingVault } = usePromise(
    async (origin: string) => {
      const selected = await getSelectedVault();
      const candidates = (await getVaultCandidates(origin)).filter((candidate) => candidate.valid);
      const validVaults = candidates.map((candidate) => candidate.path);
      const openVaults = candidates.filter((candidate) => candidate.open);
      const cliVault = openVaults.length > 0 ? await detectActiveObsidianVault() : undefined;
      const active = cliVault ?? (openVaults.length === 1 ? openVaults[0].path : undefined);
      return {
        vaults: validVaults,
        explanation:
          active === resolve(origin)
            ? "The Default Vault is active. Choose a Target Vault to inspect."
            : openVaults.length > 1
              ? "Multiple Obsidian vaults are open. Choose the Target Vault to inspect."
              : "Choose a Target Vault to inspect.",
        target:
          active && active !== resolve(origin)
            ? active
            : selected && validVaults.includes(selected)
              ? selected
              : undefined,
      };
    },
    [defaultVaultPath ?? ""],
  );

  if (!defaultVaultPath?.trim()) {
    return (
      <List>
        <List.EmptyView
          title="Set your Default Vault"
          description="Choose the source vault in extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (checkingDefaultVault || choosingVault) return <List isLoading />;
  if (!validDefaultVault) {
    return (
      <List>
        <List.EmptyView
          title="Default Vault path is invalid"
          description="Choose an existing vault containing a real .obsidian directory in extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  const target = selection?.target;
  if (!target) return <VaultList defaultVault={defaultVaultPath} explanation={selection?.explanation} />;
  return <VaultDashboard defaultVault={defaultVaultPath} targetVault={target} />;
}
