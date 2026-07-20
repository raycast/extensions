import {
  AI,
  Action,
  ActionPanel,
  Alert,
  Cache,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { execFileSync } from "node:child_process";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  EcosystemId,
  EcosystemStatus,
  OutdatedPackage,
  addIgnoredPackage,
  checkBrew,
  checkBun,
  checkCargo,
  checkComposer,
  checkDeno,
  checkGem,
  checkGo,
  checkMas,
  checkNpm,
  checkPip,
  checkPipx,
  checkPnpm,
  checkYarn,
  getIgnoredPackages,
  getPinnedPackages,
  getVersionDiffType,
  installPackage,
  isEcosystemAvailable,
  listInstalledPackages,
  removeIgnoredPackage,
  togglePinPackage,
  upgradeBrew,
  upgradeBun,
  upgradeCargo,
  upgradeComposer,
  upgradeDeno,
  upgradeGem,
  upgradeGo,
  upgradeMas,
  upgradeNpm,
  upgradePip,
  upgradePipx,
  upgradePnpm,
  upgradeYarn,
} from "./ecosystems";
import { createBackup } from "./export-backups";
import { mapWithLimit } from "./utils";

type StatusFilter =
  | "all"
  | "outdated"
  | "uptodate"
  | "errors"
  | "js"
  | "python"
  | "rust"
  | "ruby-php"
  | "system";
type StatusKind = "outdated" | "uptodate" | "errors";
type SortBy = "name" | "nameDesc" | "updateSize";

interface EcosystemDef {
  id: EcosystemId;
  name: string;
  icon: Icon;
  preferenceKey: keyof Preferences;
  checker: () => Promise<OutdatedPackage[]>;
  upgrader: () => Promise<string>;
  checkCommand: string;
  upgradeCommand: string;
  dryRunCommand: string;
}

const ECOSYSTEM_DEFS: EcosystemDef[] = [
  {
    id: "brew",
    name: "Homebrew",
    icon: Icon.MugSteam,
    preferenceKey: "enableBrew",
    checker: checkBrew,
    upgrader: upgradeBrew,
    checkCommand: "brew outdated --json=v2",
    upgradeCommand: "brew update && brew upgrade && brew upgrade --cask",
    dryRunCommand: "brew outdated --json=v2",
  },
  {
    id: "npm",
    name: "npm (global)",
    icon: Icon.Box,
    preferenceKey: "enableNpm",
    checker: checkNpm,
    upgrader: upgradeNpm,
    checkCommand: "npm outdated -g --json",
    upgradeCommand: "npm update -g",
    dryRunCommand: "npm outdated -g --json",
  },
  {
    id: "yarn",
    name: "yarn (global)",
    icon: Icon.Layers,
    preferenceKey: "enableYarn",
    checker: checkYarn,
    upgrader: upgradeYarn,
    checkCommand: "yarn global outdated --json",
    upgradeCommand: "yarn global upgrade",
    dryRunCommand: "yarn global outdated --json",
  },
  {
    id: "pnpm",
    name: "pnpm (global)",
    icon: Icon.Layers,
    preferenceKey: "enablePnpm",
    checker: checkPnpm,
    upgrader: upgradePnpm,
    checkCommand: "pnpm outdated -g --json",
    upgradeCommand: "pnpm update -g",
    dryRunCommand: "pnpm outdated -g --json",
  },
  {
    id: "pip",
    name: "pip (Python)",
    icon: Icon.Code,
    preferenceKey: "enablePip",
    checker: checkPip,
    upgrader: upgradePip,
    checkCommand: "pip list --outdated --format=json",
    upgradeCommand: "pip install --upgrade <outdated package names>",
    dryRunCommand: "pip list --outdated --format=json",
  },
  {
    id: "pipx",
    name: "pipx (Python apps)",
    icon: Icon.Code,
    preferenceKey: "enablePipx",
    checker: checkPipx,
    upgrader: upgradePipx,
    checkCommand: "pipx list --json",
    upgradeCommand: "pipx upgrade-all",
    dryRunCommand: "pipx list --json",
  },
  {
    id: "cargo",
    name: "cargo (Rust)",
    icon: Icon.Gear,
    preferenceKey: "enableCargo",
    checker: checkCargo,
    upgrader: upgradeCargo,
    checkCommand: "cargo install-update --list",
    upgradeCommand: "cargo install-update --all",
    dryRunCommand: "cargo install-update --list",
  },
  {
    id: "gem",
    name: "gem (Ruby)",
    icon: Icon.Stars,
    preferenceKey: "enableGem",
    checker: checkGem,
    upgrader: upgradeGem,
    checkCommand: "gem outdated",
    upgradeCommand: "gem update",
    dryRunCommand: "gem outdated",
  },
  {
    id: "mas",
    name: "Mac App Store",
    icon: Icon.AppWindowGrid3x3,
    preferenceKey: "enableMas",
    checker: checkMas,
    upgrader: upgradeMas,
    checkCommand: "mas outdated",
    upgradeCommand: "mas upgrade",
    dryRunCommand: "mas outdated",
  },
  {
    id: "go",
    name: "go (Go tools)",
    icon: Icon.Terminal,
    preferenceKey: "enableGo",
    checker: checkGo,
    upgrader: upgradeGo,
    checkCommand: "go list -m -u -json all",
    upgradeCommand: "go install <module>@latest",
    dryRunCommand: "go list -m -u -json all",
  },
  {
    id: "bun",
    name: "bun (global)",
    icon: Icon.Box,
    preferenceKey: "enableBun",
    checker: checkBun,
    upgrader: upgradeBun,
    checkCommand: "bun outdated -g",
    upgradeCommand: "bun update -g",
    dryRunCommand: "bun outdated -g",
  },
  {
    id: "deno",
    name: "deno (global)",
    icon: Icon.Terminal,
    preferenceKey: "enableDeno",
    checker: checkDeno,
    upgrader: upgradeDeno,
    checkCommand: "deno outdated (Not Supported)",
    upgradeCommand: "deno upgrade",
    dryRunCommand: "echo 'Not supported'",
  },
  {
    id: "composer",
    name: "composer (global)",
    icon: Icon.Box,
    preferenceKey: "enableComposer",
    checker: checkComposer,
    upgrader: upgradeComposer,
    checkCommand: "composer global outdated",
    upgradeCommand: "composer global update",
    dryRunCommand: "composer global outdated",
  },
];

function getStatusKind(status: EcosystemStatus): StatusKind {
  if (status.error) {
    return "errors";
  }

  if (status.packages.length > 0) {
    return "outdated";
  }

  return "uptodate";
}

function getStatusIcon(status: EcosystemStatus): {
  source: Icon;
  tintColor: Color.ColorLike;
} {
  if (status.error) {
    return { source: Icon.Warning, tintColor: Color.Red };
  }

  if (status.loading) {
    return { source: Icon.RotateClockwise, tintColor: Color.SecondaryText };
  }

  if (status.packages.length > 0) {
    return { source: Icon.ArrowUpCircle, tintColor: Color.Orange };
  }

  return { source: Icon.CheckCircle, tintColor: Color.Green };
}

function getStatusBadge(status: EcosystemStatus): {
  value: string;
  color: Color.ColorLike;
} {
  if (status.loading) {
    return { value: "Checking…", color: Color.SecondaryText };
  }

  if (status.error) {
    return { value: "Error", color: Color.Red };
  }

  if (status.packages.length === 0) {
    return { value: "Up to date", color: Color.Green };
  }

  return { value: `${status.packages.length} outdated`, color: Color.Orange };
}

function getFilterLabel(filter: StatusFilter): string {
  switch (filter) {
    case "outdated":
      return "Outdated";
    case "uptodate":
      return "Up to Date";
    case "errors":
      return "Errors";
    case "js":
      return "Node / JS";
    case "python":
      return "Python";
    case "rust":
      return "Rust";
    case "ruby-php":
      return "Ruby / PHP";
    case "system":
      return "System";
    default:
      return "All";
  }
}

function createLoadingStatuses(defs: EcosystemDef[]): EcosystemStatus[] {
  return defs.map((def) => ({
    id: def.id,
    name: def.name,
    enabled: true,
    packages: [],
    loading: true,
  }));
}

// All ignore helpers are canonical — imported from ecosystems.ts
// using getIgnoredPackages / addIgnoredPackage / removeIgnoredPackage.
// DO NOT define local versions here (they used a different LocalStorage key).

// --- AI Summary View ---
function AISummaryView(props: { pkg: OutdatedPackage; managerName: string }) {
  const { pkg, managerName } = props;
  const [summary, setSummary] = useState<string>("Asking Raycast AI...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchSummary() {
      if (!environment.canAccess(AI)) {
        if (active) {
          setSummary("Raycast Pro is required to use AI features.");
          setIsLoading(false);
        }
        return;
      }
      try {
        const prompt = `I am upgrading the ${managerName} package "${pkg.name}" from version ${pkg.current} to ${pkg.latest}. What are the major breaking changes, important new features, or security fixes I should be aware of? Keep it to a few concise bullet points.`;
        const result = await AI.ask(prompt);
        if (active) {
          setSummary(result);
          setIsLoading(false);
        }
      } catch (error: any) {
        if (active) {
          setSummary(`Failed to get AI summary: ${error.message}`);
          setIsLoading(false);
        }
      }
    }
    void fetchSummary();
    return () => {
      active = false;
    };
  }, [pkg, managerName]);

  return (
    <Detail
      markdown={`# 🤖 AI Upgrade Summary\n\n**Package:** ${pkg.name} (${pkg.current} ➡️ ${pkg.latest})\n\n---\n\n${summary}`}
      isLoading={isLoading}
    />
  );
}

// --- Status loading ---
// ─── Streaming status loader ───────────────────────────────────────────────────
// Loads one ecosystem at a time and calls onResult immediately so
// the UI updates progressively instead of waiting for all to finish.
// Uses mapWithLimit(3) to cap concurrent shell processes and prevent OOM.
async function loadStatusesStreaming(
  defs: EcosystemDef[],
  ignored: string[],
  onResult: (status: EcosystemStatus) => void,
): Promise<EcosystemStatus[]> {
  const results = await mapWithLimit(
    defs,
    async (def) => {
      let status: EcosystemStatus;
      try {
        const available = await isEcosystemAvailable(def.id);
        if (!available) {
          status = {
            id: def.id,
            name: def.name,
            enabled: true,
            packages: [],
            error: `${def.name} is not installed on this system.`,
          };
        } else {
          const packages = await def.checker();
          const filteredPackages = packages.filter(
            (p) => !ignored.includes(p.name),
          );
          status = {
            id: def.id,
            name: def.name,
            enabled: true,
            packages: filteredPackages,
          };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        status = {
          id: def.id,
          name: def.name,
          enabled: true,
          packages: [],
          error: message,
        };
      }
      // Notify caller as soon as this one is done—don't wait for others
      onResult(status);
      return status;
    },
    3, // max 3 parallel shell processes
  );
  return results;
}

function notifyMacOS(title: string, subtitle: string, body?: string) {
  try {
    const scriptParts = [`display notification ${JSON.stringify(body ?? "")}`];
    scriptParts.push(`with title ${JSON.stringify(title)}`);
    if (subtitle) {
      scriptParts.push(`subtitle ${JSON.stringify(subtitle)}`);
    }
    execFileSync("osascript", ["-e", scriptParts.join(" ")], {
      encoding: "utf-8",
    });
  } catch {
    // Best-effort only.
  }
}

function sortPackages(
  packages: OutdatedPackage[],
  sortBy: SortBy,
): OutdatedPackage[] {
  const sorted = [...packages];
  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "nameDesc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "updateSize":
      return sorted.sort((a, b) => {
        const aSemver = a.latest.split(".").map(Number);
        const bSemver = b.latest.split(".").map(Number);
        const aMajor = aSemver[0] || 0;
        const bMajor = bSemver[0] || 0;
        return bMajor - aMajor;
      });
    default:
      return sorted;
  }
}

function excludeMajorUpdates(packages: OutdatedPackage[]): OutdatedPackage[] {
  return packages.filter((pkg) => {
    const currentMajor = parseInt(pkg.current.split(".")[0], 10);
    const latestMajor = parseInt(pkg.latest.split(".")[0], 10);
    if (isNaN(currentMajor) || isNaN(latestMajor)) return true;
    return currentMajor === latestMajor;
  });
}

function buildDetailMarkdown(
  status: EcosystemStatus,
  showUpdateDetails: boolean,
  sortBy: SortBy,
  skipMajorVersions: boolean,
): string {
  if (status.error) {
    return `## ⚠️ Error\n\n\`\`\`\n${status.error}\n\`\`\``;
  }

  if (status.packages.length === 0) {
    return `## ✅ ${status.name}\n\nAll packages are up to date.`;
  }

  let displayPackages = [...status.packages];

  if (skipMajorVersions) {
    const filtered = excludeMajorUpdates(displayPackages);
    displayPackages = filtered;
  }

  displayPackages = sortPackages(displayPackages, sortBy);

  const header = showUpdateDetails
    ? "| Package | Current | Latest |\n|---|---|---|"
    : "| Package |\n|---|";

  const rows = displayPackages
    .map((packageItem) => {
      const nameWithLink = packageItem.website
        ? `[${packageItem.name}](${packageItem.website})`
        : `\`${packageItem.name}\``;

      let displayName = nameWithLink;
      if (packageItem.changelog) {
        displayName += ` [📖](${packageItem.changelog})`;
      }

      if (showUpdateDetails) {
        return `| ${displayName} | ${packageItem.current} | **${packageItem.latest}** |`;
      }
      return `| ${displayName} |`;
    })
    .join("\n");

  const majorUpdateNote = skipMajorVersions
    ? `\n\n> ⚠️ Major version updates are hidden. Disable "Skip major versions" in preferences to show them.`
    : "";

  return `## ${status.name}\n\n${header}\n${rows}${majorUpdateNote}`;
}

function buildStatusSections(
  statuses: EcosystemStatus[],
  showUpToDate: boolean,
  filter: StatusFilter,
): Array<{ title: string; items: EcosystemStatus[] }> {
  const jsIds = ["npm", "yarn", "pnpm", "bun", "deno"];
  const pythonIds = ["pip", "pipx"];
  const rustIds = ["cargo"];
  const rubyPhpIds = ["gem", "composer"];
  const systemIds = ["brew", "mas", "go"];

  const filteredStatuses = statuses.filter((status) => {
    // 1. First, check ecosystem ID category filters
    if (filter === "js" && !jsIds.includes(status.id)) return false;
    if (filter === "python" && !pythonIds.includes(status.id)) return false;
    if (filter === "rust" && !rustIds.includes(status.id)) return false;
    if (filter === "ruby-php" && !rubyPhpIds.includes(status.id)) return false;
    if (filter === "system" && !systemIds.includes(status.id)) return false;

    // 2. Then check status kind filters
    const kind = getStatusKind(status);
    if (filter === "outdated" && kind !== "outdated") return false;
    if (filter === "uptodate" && kind !== "uptodate") return false;
    if (filter === "errors" && kind !== "errors") return false;

    if (!showUpToDate && kind === "uptodate") {
      return false;
    }

    return true;
  });

  const sections = [
    {
      title: "Outdated",
      items: filteredStatuses.filter(
        (status) => getStatusKind(status) === "outdated",
      ),
    },
    {
      title: "Up to Date",
      items: filteredStatuses.filter(
        (status) => getStatusKind(status) === "uptodate",
      ),
    },
    {
      title: "Errors",
      items: filteredStatuses.filter(
        (status) => getStatusKind(status) === "errors",
      ),
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}

function getEmptyStateDescription(
  totalOutdated: number,
  showUpToDate: boolean,
  enabledCount: number,
): string {
  if (totalOutdated === 0) {
    if (showUpToDate) {
      return enabledCount > 0
        ? "All enabled ecosystems are clean. Open preferences to enable more managers or use the filter to narrow the view."
        : "Open preferences to enable the managers you want to track.";
    }
    return "Open preferences if you want to show up-to-date ecosystems as well, or switch the filter to see more detail.";
  }

  return "Try a different filter, refresh the list, or open preferences to enable more managers.";
}

function PackageListView(
  props: Readonly<{
    status: EcosystemStatus;
    showUpdateDetails: boolean;
    sortBy: SortBy;
    skipMajorVersions: boolean;
    onRefresh: () => void;
  }>,
) {
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [ignoredKeys, setIgnoredKeys] = useState<string[]>([]);

  const loadLocalState = useCallback(async () => {
    const pins = await getPinnedPackages();
    const ignores = await getIgnoredPackages();
    setPinnedKeys(pins);
    setIgnoredKeys(ignores);
  }, []);

  useEffect(() => {
    void loadLocalState();
  }, [loadLocalState]);

  let displayPackages = [...props.status.packages];
  if (props.skipMajorVersions) {
    displayPackages = excludeMajorUpdates(displayPackages);
  }
  displayPackages = sortPackages(displayPackages, props.sortBy);

  const pinnedPackages = displayPackages.filter((p) =>
    pinnedKeys.includes(`${props.status.id}:${p.name}`),
  );
  const unpinnedPackages = displayPackages.filter(
    (p) => !pinnedKeys.includes(`${props.status.id}:${p.name}`),
  );

  const renderPackageItem = (pkg: OutdatedPackage) => {
    const itemKey = `${props.status.id}:${pkg.name}`;
    const isPinned = pinnedKeys.includes(itemKey);
    const isIgnored = ignoredKeys.includes(pkg.name);
    const diffType = getVersionDiffType(pkg.current, pkg.latest);

    let badgeColor: Color.ColorLike = Color.Green;
    let badgeLabel = "Patch";

    if (diffType === "major") {
      badgeColor = Color.Red;
      badgeLabel = "🚨 Major";
    } else if (diffType === "minor") {
      badgeColor = Color.Yellow;
      badgeLabel = "⚠️ Minor";
    } else if (diffType === "patch") {
      badgeColor = Color.Green;
      badgeLabel = "🟢 Patch";
    }

    const markdownDetail = `
# 📦 \`${pkg.name}\`

| Metadata | Details |
|---|---|
| **Ecosystem** | ${props.status.name} |
| **Current Version** | \`${pkg.current}\` |
| **Latest Version** | \`${pkg.latest}\` |
| **Update Type** | **${diffType.toUpperCase()}** |
| **Pinned** | ${isPinned ? "📌 Yes" : "No"} |
| **Status** | ${isIgnored ? "👁️ Ignored" : "Active"} |

---

### Links & Documentation
${pkg.website ? `- 🌐 [Official Website](${pkg.website})` : "- 🌐 No website available"}
${pkg.changelog ? `- 📖 [Release Notes & Changelog](${pkg.changelog})` : "- 📖 No changelog available"}

---
### Shell Command Preview
\`\`\`bash
${props.status.id} upgrade ${pkg.name}
\`\`\`
`;

    return (
      <List.Item
        key={pkg.name}
        title={pkg.name}
        subtitle={
          props.showUpdateDetails
            ? `${pkg.current} ➡️ ${pkg.latest}`
            : undefined
        }
        icon={
          isPinned ? { source: Icon.Pin, tintColor: Color.Orange } : Icon.Box
        }
        accessories={[
          { tag: { value: badgeLabel, color: badgeColor } },
          ...(isPinned ? [{ icon: Icon.Pin, tooltip: "Pinned package" }] : []),
          ...(pkg.changelog
            ? [{ icon: Icon.Book, tooltip: pkg.changelog }]
            : []),
        ]}
        detail={<List.Item.Detail markdown={markdownDetail} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Upgrade">
              <Action
                title={`Upgrade ${pkg.name}`}
                icon={Icon.ArrowUp}
                onAction={async () => {
                  const def = props.status;
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Upgrading ${pkg.name}…`,
                  });
                  try {
                    // Use ecosystem-specific single-package upgrade
                    await installPackage(def.id, pkg.name);
                    toast.style = Toast.Style.Success;
                    toast.title = `${pkg.name} upgraded to ${pkg.latest}`;
                    props.onRefresh();
                  } catch (err: any) {
                    toast.style = Toast.Style.Failure;
                    toast.title = `Upgrade failed`;
                    toast.message = err?.message ?? String(err);
                  }
                }}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Package Actions">
              {environment.canAccess(AI) && (
                <Action.Push
                  title="Summarize with AI"
                  icon={Icon.Stars}
                  target={
                    <AISummaryView pkg={pkg} managerName={props.status.name} />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              )}
              <Action
                title={isPinned ? "Unpin Package" : "Pin Package"}
                icon={Icon.Pin}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                onAction={async () => {
                  const state = await togglePinPackage(itemKey);
                  await showToast({
                    style: Toast.Style.Success,
                    title: state
                      ? `Pinned ${pkg.name}`
                      : `Unpinned ${pkg.name}`,
                  });
                  await loadLocalState();
                }}
              />
              <Action
                title={isIgnored ? "Unignore Package" : "Ignore Package"}
                icon={Icon.EyeDisabled}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={async () => {
                  if (isIgnored) {
                    await removeIgnoredPackage(pkg.name);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Unignored ${pkg.name}`,
                    });
                  } else {
                    await addIgnoredPackage(pkg.name);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Ignored ${pkg.name}`,
                    });
                  }
                  await loadLocalState();
                  props.onRefresh();
                }}
              />
              <Action
                title="Toggle Sidebar Details"
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Links & Copy">
              {pkg.website && (
                <Action.OpenInBrowser title="Open Website" url={pkg.website} />
              )}
              {pkg.changelog && (
                <Action.OpenInBrowser
                  title="Open Changelog"
                  url={pkg.changelog}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Package Name"
                content={pkg.name}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Copy Upgrade Command"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "opt"], key: "u" }}
                onAction={() =>
                  Clipboard.copy(`${props.status.id} upgrade ${pkg.name}`)
                }
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      navigationTitle={`Updates for ${props.status.name}`}
      isShowingDetail={isShowingDetail}
    >
      {pinnedPackages.length > 0 && (
        <List.Section title="📌 Pinned Packages">
          {pinnedPackages.map(renderPackageItem)}
        </List.Section>
      )}
      <List.Section
        title={
          pinnedPackages.length > 0
            ? "All Outdated Packages"
            : "Outdated Packages"
        }
      >
        {unpinnedPackages.map(renderPackageItem)}
      </List.Section>
    </List>
  );
}

function InstallForm(props: { def: EcosystemDef; onDone: () => void }) {
  const { def, onDone } = props;

  const showUserInstallOption = def.id === "pip" || def.id === "pipx";
  const showGlobalOption =
    def.id === "npm" || def.id === "yarn" || def.id === "pnpm";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Install Package Using ${def.name}`}
            onSubmit={async (values) => {
              const pkg = (values as any).package as string;
              const userInstall = (values as any).userInstall as
                | boolean
                | undefined;
              const globalInstall = (values as any).globalInstall as
                | boolean
                | undefined;

              const toast = await showToast({
                style: Toast.Style.Animated,
                title: `Installing ${pkg}…`,
              });
              try {
                await installPackage(def.id, pkg, {
                  userInstall,
                  globalInstall,
                });
                toast.style = Toast.Style.Success;
                toast.title = `Installed ${pkg}`;
                onDone();
              } catch (err: any) {
                toast.style = Toast.Style.Failure;
                toast.title = `Install failed`;
                toast.message = err?.message ?? String(err);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="package"
        title="Package name"
        placeholder={
          def.id === "npm" || def.id === "yarn"
            ? "e.g. express, lodash, typescript"
            : def.id === "pip" || def.id === "pipx"
              ? "e.g. requests, django, flask"
              : def.id === "gem"
                ? "e.g. rails, bundler, sinatra"
                : "Package name"
        }
      />
      {showUserInstallOption && (
        <Form.Checkbox
          id="userInstall"
          label="Install for user only (--user flag)"
          defaultValue={false}
        />
      )}
      {showGlobalOption && (
        <Form.Checkbox
          id="globalInstall"
          label="Install globally (-g flag)"
          defaultValue={true}
        />
      )}
      {def.id === "pip" && (
        <>
          <Form.Separator />
          <Form.Description text="Tip: Use 'pip install package_name' for user install or 'sudo pip install package_name' for system-wide" />
        </>
      )}
    </Form>
  );
}

function InstalledList(props: { def: EcosystemDef }) {
  const { def } = props;
  const [markdown, setMarkdown] = useState("Loading…");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pkgs = await listInstalledPackages(def.id);
        if (!mounted) return;
        if (pkgs.length === 0) {
          setMarkdown(
            `## ${def.name}\n\nNo installed packages found or the tool is not available.`,
          );
          return;
        }

        const header = "| Package | Version |\n|---|---|";
        const rows = pkgs.map((p) => {
          const name = p.website
            ? `[${p.name}](${p.website})`
            : `\`${p.name}\``;
          return `| ${name} | ${p.current} |`;
        });

        setMarkdown(
          `## Installed packages — ${def.name}\n\n${header}\n${rows.join("\n")}\n\n*Note: Use the standalone List Installed Packages command to uninstall packages.*`,
        );
      } catch (err: any) {
        setMarkdown(`## Error\n\n${err?.message ?? String(err)}`);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [def]);

  return <Detail markdown={markdown} />;
}

interface EcosystemActionPanelProps {
  status: EcosystemStatus;
  def: EcosystemDef;
  allowUpgradeAll: boolean;
  dryRunMode: boolean;
  backupBeforeUpgrade: boolean;
  onUpgrade: (def: EcosystemDef, status: EcosystemStatus) => Promise<void>;
  onUpgradeAll: () => Promise<void>;
  onRefresh: () => void;
  available: boolean;
}

function EcosystemActionPanel({
  status,
  def,
  allowUpgradeAll,
  dryRunMode,
  backupBeforeUpgrade,
  onUpgrade,
  onUpgradeAll,
  onRefresh,
  available,
}: Readonly<EcosystemActionPanelProps>) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Actions">
        {!status.error && status.packages.length > 0 && available && (
          <Action
            title={
              dryRunMode ? `Dry-Run ${status.name}` : `Upgrade ${status.name}`
            }
            icon={dryRunMode ? Icon.Eye : Icon.ArrowUp}
            onAction={() => {
              void onUpgrade(def, status);
            }}
          />
        )}
        {allowUpgradeAll && available && status.packages.length > 0 && (
          <Action
            title={
              dryRunMode ? "Dry Run All Ecosystems" : "Upgrade All Ecosystems"
            }
            icon={dryRunMode ? Icon.Eye : Icon.ArrowUpCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={() => {
              void onUpgradeAll();
            }}
          />
        )}
        <Action
          title="Refresh"
          icon={Icon.RotateClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
        <Action.Push
          title="Install Package"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          target={<InstallForm def={def} onDone={() => onRefresh()} />}
        />
        <Action.Push
          title="Show Installed Packages"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          target={<InstalledList def={def} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Details">
        {!status.loading && status.packages.length > 0 && (
          <Action.Push
            title="View Package List"
            icon={Icon.List}
            target={
              <PackageListView
                status={status}
                showUpdateDetails={true}
                sortBy="name"
                skipMajorVersions={false}
                onRefresh={onRefresh}
              />
            }
          />
        )}
        {status.error && (
          <Action.Push
            title="View Error Details"
            icon={Icon.ExclamationMark}
            target={
              <Detail
                markdown={buildDetailMarkdown(status, true, "name", false)}
              />
            }
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Commands">
        <Action.CopyToClipboard
          title="Copy Check Command"
          content={def.checkCommand}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Upgrade Command"
          content={def.upgradeCommand}
          shortcut={{ modifiers: ["cmd", "opt"], key: "u" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Safety">
        {backupBeforeUpgrade && (
          <Action
            title="Backup Current Versions"
            icon={Icon.Shield}
            onAction={async () => {
              try {
                await createBackup();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Backup created",
                  message: `Versions saved for ${status.name}`,
                });
              } catch (error: unknown) {
                const message =
                  error instanceof Error ? error.message : String(error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Backup failed",
                  message,
                });
              }
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Settings">
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

interface EcosystemItemProps {
  status: EcosystemStatus;
  def: EcosystemDef;
  allowUpgradeAll: boolean;
  dryRunMode: boolean;
  backupBeforeUpgrade: boolean;
  showUpdateDetails: boolean;
  sortBy: SortBy;
  skipMajorVersions: boolean;
  compactMode: boolean;
  availability: Map<EcosystemId, boolean>;
  onUpgrade: (def: EcosystemDef, status: EcosystemStatus) => Promise<void>;
  onUpgradeAll: () => Promise<void>;
  onRefresh: () => void;
}

function EcosystemItem({
  status,
  def,
  allowUpgradeAll,
  dryRunMode,
  backupBeforeUpgrade,
  showUpdateDetails,
  sortBy,
  skipMajorVersions,
  compactMode,
  availability,
  onUpgrade,
  onUpgradeAll,
  onRefresh,
}: Readonly<EcosystemItemProps>) {
  const badge = getStatusBadge(status);
  const icon = getStatusIcon(status);

  const accessoryItems: List.Item.Accessory[] = [
    { tag: { value: badge.value, color: badge.color } },
  ];
  const available = availability.get(def.id) ?? true;
  if (!available) {
    accessoryItems.push({ tag: { value: "Not installed", color: Color.Red } });
  }

  if (showUpdateDetails && status.packages.length > 0) {
    const majorUpdates = status.packages.filter((pkg) => {
      const currentMajor = parseInt(pkg.current.split(".")[0], 10);
      const latestMajor = parseInt(pkg.latest.split(".")[0], 10);
      return (
        !isNaN(currentMajor) &&
        !isNaN(latestMajor) &&
        currentMajor !== latestMajor
      );
    });

    if (majorUpdates.length > 0) {
      accessoryItems.push({
        tag: { value: `${majorUpdates.length} major`, color: Color.Red },
      });
    }
  }

  const detailMarkdown = useMemo(
    () =>
      buildDetailMarkdown(status, showUpdateDetails, sortBy, skipMajorVersions),
    [status, showUpdateDetails, sortBy, skipMajorVersions],
  );

  return (
    <List.Item
      title={status.name}
      subtitle={
        compactMode ? undefined : `${status.packages.length} package(s)`
      }
      icon={{ source: icon.source, tintColor: icon.tintColor }}
      accessories={accessoryItems}
      detail={<List.Item.Detail markdown={detailMarkdown} />}
      actions={
        <EcosystemActionPanel
          status={status}
          def={def}
          allowUpgradeAll={allowUpgradeAll}
          dryRunMode={dryRunMode}
          backupBeforeUpgrade={backupBeforeUpgrade}
          onUpgrade={onUpgrade}
          onUpgradeAll={onUpgradeAll}
          onRefresh={onRefresh}
          available={available}
        />
      }
    />
  );
}

interface StatusSectionProps {
  title: string;
  items: EcosystemStatus[];
  defsById: Map<EcosystemId, EcosystemDef>;
  allowUpgradeAll: boolean;
  dryRunMode: boolean;
  backupBeforeUpgrade: boolean;
  showUpdateDetails: boolean;
  sortBy: SortBy;
  skipMajorVersions: boolean;
  compactMode: boolean;
  onUpgrade: (def: EcosystemDef, status: EcosystemStatus) => Promise<void>;
  onUpgradeAll: () => Promise<void>;
  onRefresh: () => void;
  availability: Map<EcosystemId, boolean>;
}

function StatusSection({
  title,
  items,
  defsById,
  allowUpgradeAll,
  dryRunMode,
  backupBeforeUpgrade,
  showUpdateDetails,
  sortBy,
  skipMajorVersions,
  compactMode,
  onUpgrade,
  onUpgradeAll,
  onRefresh,
  availability,
}: Readonly<StatusSectionProps>) {
  return (
    <List.Section title={title} subtitle={`${items.length} ecosystem(s)`}>
      {items.map((status) => {
        const def = defsById.get(status.id);

        if (!def) {
          return null;
        }

        return (
          <EcosystemItem
            key={status.id}
            status={status}
            def={def}
            allowUpgradeAll={allowUpgradeAll}
            dryRunMode={dryRunMode}
            backupBeforeUpgrade={backupBeforeUpgrade}
            showUpdateDetails={showUpdateDetails}
            sortBy={sortBy}
            skipMajorVersions={skipMajorVersions}
            compactMode={compactMode}
            availability={availability}
            onUpgrade={onUpgrade}
            onUpgradeAll={onUpgradeAll}
            onRefresh={onRefresh}
          />
        );
      })}
    </List.Section>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const statusesCache = new Cache({ namespace: "universal-updater-statuses" });

export default function Command() {
  const prefs = useMemo(() => getPreferenceValues<Preferences>(), []);
  const enabledDefs = useMemo(
    () => ECOSYSTEM_DEFS.filter((def) => prefs[def.preferenceKey]),
    [prefs],
  );
  const defsById = useMemo(
    () => new Map(enabledDefs.map((def) => [def.id, def])),
    [enabledDefs],
  );

  const [statuses, setStatuses] = useState<EcosystemStatus[]>(() => {
    const cached = statusesCache.get("statuses");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse errors
      }
    }
    return createLoadingStatuses(enabledDefs);
  });

  const [availability, setAvailability] = useState<Map<EcosystemId, boolean>>(
    new Map(),
  );
  const [filter, setFilter] = useState<StatusFilter>("all");

  const [isLoading, setIsLoading] = useState(() => {
    const cached = statusesCache.get("statuses");
    return !cached;
  });

  const [lastCheckTime, setLastCheckTime] = useState<number>(() => {
    const cached = statusesCache.get("lastCheckTime");
    return cached ? parseInt(cached, 10) : 0;
  });

  const lastNotifiedOutdatedCount = useRef<number | null>(null);

  const refreshStatuses = useCallback(async () => {
    const ignored = await getIgnoredPackages();

    // Start with loading state for all
    setStatuses(createLoadingStatuses(enabledDefs));
    setIsLoading(true);

    // Stream results: update each ecosystem as soon as it completes
    // Uses mapWithLimit(3) internally to cap shell processes and prevent OOM
    const freshStatuses = await loadStatusesStreaming(
      enabledDefs,
      ignored,
      (status) => {
        setStatuses((prev) =>
          prev.map((s) => (s.id === status.id ? status : s)),
        );
      },
    );

    // Check availability in the same pass (already done inside loadStatusesStreaming)
    const map = new Map<EcosystemId, boolean>();
    for (const s of freshStatuses) {
      map.set(s.id, !s.error || !s.error.includes("not installed"));
    }
    setAvailability(map);
    setIsLoading(false);

    const nowTime = Date.now();
    setLastCheckTime(nowTime);

    // Save to local cache
    try {
      statusesCache.set("statuses", JSON.stringify(freshStatuses));
      statusesCache.set("lastCheckTime", String(nowTime));
    } catch {
      // Ignore cache write errors
    }

    const totalOutdatedCount = freshStatuses.reduce(
      (accumulator, status) => accumulator + status.packages.length,
      0,
    );

    if (
      prefs.notificationsEnabled &&
      totalOutdatedCount > 0 &&
      lastNotifiedOutdatedCount.current !== totalOutdatedCount
    ) {
      const ecosystemNames = freshStatuses
        .filter((status) => status.packages.length > 0)
        .map((status) => status.name)
        .slice(0, 5)
        .join(", ");

      notifyMacOS(
        "Universal Updater",
        `${totalOutdatedCount} package(s) need attention`,
        ecosystemNames || "Updates are available",
      );
    }

    lastNotifiedOutdatedCount.current = totalOutdatedCount;
  }, [enabledDefs, prefs.notificationsEnabled]);

  const refreshRef = useRef(refreshStatuses);
  refreshRef.current = refreshStatuses;

  useEffect(() => {
    void refreshStatuses();
  }, []);

  useEffect(() => {
    const interval = parseInt(prefs.autoRefreshInterval, 10);
    if (isNaN(interval) || interval <= 0) return;

    const timer = setInterval(
      () => {
        void refreshRef.current();
      },
      interval * 60 * 1000,
    );

    return () => clearInterval(timer);
  }, [prefs.autoRefreshInterval]);

  const filteredSections = useMemo(
    () => buildStatusSections(statuses, prefs.showUpToDateEcosystems, filter),
    [filter, prefs.showUpToDateEcosystems, statuses],
  );

  const totalOutdated = statuses.reduce(
    (accumulator, status) => accumulator + status.packages.length,
    0,
  );
  const hasEnabledManagers = enabledDefs.length > 0;
  const hasVisibleResults = filteredSections.length > 0;
  const showUpToDate = prefs.showUpToDateEcosystems;
  const allowUpgradeAll = totalOutdated > 1;
  const isShowingDetail = statuses.some(
    (status) => !status.loading && !status.error && status.packages.length > 0,
  );
  const filterLabel = getFilterLabel(filter);
  const emptyStateDescription = getEmptyStateDescription(
    totalOutdated,
    showUpToDate,
    enabledDefs.length,
  );
  const outdatedEcosystemsCount = statuses.filter(
    (status) => !status.loading && !status.error && status.packages.length > 0,
  ).length;
  const healthyEcosystemsCount = statuses.filter(
    (status) =>
      !status.loading && !status.error && status.packages.length === 0,
  ).length;
  const enabledCount = enabledDefs.length;

  async function handleUpgrade(def: EcosystemDef, status: EcosystemStatus) {
    if (status.error || status.packages.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${status.name} is not installed`,
        message: "Install the package manager before trying to upgrade it.",
      });
      return;
    }

    if (prefs.dryRunMode) {
      await showToast({
        style: Toast.Style.Success,
        title: "Dry-run mode",
        message: `${status.name} — ${status.packages.length} package(s) would be upgraded`,
      });
      return;
    }

    if (prefs.confirmBeforeUpgrade) {
      const confirmed = await confirmAlert({
        title: `Upgrade ${status.name}?`,
        message:
          status.packages.length > 0
            ? `${status.packages.length} package(s) will be upgraded. This may take a while.`
            : "Run the upgrade command now?",
        primaryAction: { title: "Upgrade", style: Alert.ActionStyle.Default },
      });

      if (!confirmed) {
        return;
      }
    }

    if (prefs.backupBeforeUpgrade) {
      try {
        await createBackup();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Backup failed",
          message,
        });
        return;
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Upgrading ${status.name}…`,
    });

    try {
      await def.upgrader();
      toast.style = Toast.Style.Success;
      toast.title = `${status.name} upgraded!`;
      await refreshStatuses();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = `${status.name} upgrade failed`;
      toast.message = message;
    }
  }

  async function handleUpgradeAll() {
    const outdatedDefs = statuses
      .filter((status) => status.packages.length > 0 && !status.error)
      .map((status) => defsById.get(status.id))
      .filter((def): def is EcosystemDef => def !== undefined);

    if (outdatedDefs.length === 0) {
      await showHUD("Everything is already up to date! 🎉");
      return;
    }

    if (prefs.dryRunMode) {
      const summary = outdatedDefs
        .map((def) => {
          const status = statuses.find((s) => s.id === def.id);
          return `${def.name}: ${status?.packages.length || 0} package(s)`;
        })
        .join("\n");

      await showToast({
        style: Toast.Style.Success,
        title: "Dry-run mode",
        message: `Would upgrade:\n${summary}`,
      });
      return;
    }

    if (prefs.confirmBeforeUpgrade) {
      const confirmed = await confirmAlert({
        title: "Upgrade all ecosystems?",
        message: `${outdatedDefs.map((def) => def.name).join(", ")} will be upgraded.`,
        primaryAction: {
          title: "Upgrade All",
          style: Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) {
        return;
      }
    }

    if (prefs.parallelUpgrade) {
      const upgradePromises = outdatedDefs.map(async (def) => {
        const status = statuses.find((item) => item.id === def.id);
        if (!status) return;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Upgrading ${status.name}…`,
        });

        try {
          await def.upgrader();
          toast.style = Toast.Style.Success;
          toast.title = `${status.name} upgraded`;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          toast.style = Toast.Style.Failure;
          toast.title = `${status.name} upgrade failed`;
          toast.message = message;
        }
      });

      await Promise.all(upgradePromises);
    } else {
      for (const def of outdatedDefs) {
        const status = statuses.find((item) => item.id === def.id);

        if (!status) {
          continue;
        }

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Upgrading ${status.name}…`,
        });

        try {
          await def.upgrader();
          toast.style = Toast.Style.Success;
          toast.title = `${status.name} upgraded`;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          toast.style = Toast.Style.Failure;
          toast.title = `${status.name} upgrade failed`;
          toast.message = message;
        }
      }
    }

    await refreshStatuses();
    await showHUD("All upgrades finished! 🎉");
  }

  const totalPackages = statuses.reduce(
    (acc, status) => acc + status.packages.length,
    0,
  );
  const totalErrors = statuses.filter((s) => s.error).length;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Universal Updater"
      searchBarPlaceholder="Filter ecosystems…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter ecosystems"
          storeValue={false}
          onChange={(value) => setFilter(value as StatusFilter)}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Outdated" value="outdated" />
            <List.Dropdown.Item title="Up to Date" value="uptodate" />
            <List.Dropdown.Item title="Errors" value="errors" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Languages & Categories">
            <List.Dropdown.Item title="Node / JS" value="js" />
            <List.Dropdown.Item title="Python" value="python" />
            <List.Dropdown.Item title="Rust" value="rust" />
            <List.Dropdown.Item title="Ruby / PHP" value="ruby-php" />
            <List.Dropdown.Item title="System (Brew/Mac)" value="system" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isShowingDetail={isShowingDetail}
    >
      {hasEnabledManagers && (
        <List.Section title="Overview">
          {prefs.dryRunMode && (
            <List.Item
              title="⚠️ Dry-Run Mode Active"
              subtitle="Upgrades will be simulated without modifying packages"
              icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Preferences to Disable"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            title={`Health Score: ${
              totalOutdated === 0 &&
              Array.from(availability.values()).filter((v) => !v).length === 0
                ? "100% (A+) 🟢"
                : totalOutdated <= 3
                  ? "90% (A) 🟢"
                  : totalOutdated <= 10
                    ? "75% (B) 🔵"
                    : totalOutdated <= 25
                      ? "55% (C) 🟡"
                      : "35% (D) 🔴"
            }`}
            subtitle={
              totalOutdated === 0
                ? "Your system is perfectly up to date!"
                : `You have ${totalOutdated} outdated package${
                    totalOutdated === 1 ? "" : "s"
                  } across ${statuses.filter((s) => s.packages.length > 0).length} ecosystem${
                    statuses.filter((s) => s.packages.length > 0).length === 1
                      ? ""
                      : "s"
                  }.`
            }
            icon={{
              source: Icon.Heartbeat,
              tintColor:
                totalOutdated === 0
                  ? Color.Green
                  : totalOutdated <= 10
                    ? Color.Yellow
                    : Color.Red,
            }}
            accessories={[
              { text: `${outdatedEcosystemsCount} ecosystems need updates` },
              { text: `${healthyEcosystemsCount} are up to date` },
            ]}
          />
          <List.Item
            title="Tracking Coverage"
            subtitle={`${enabledCount} enabled manager${enabledCount === 1 ? "" : "s"} | ${totalErrors} error${totalErrors === 1 ? "" : "s"}`}
            icon={{ source: Icon.AppWindow, tintColor: Color.Blue }}
            accessories={[
              { text: `${totalPackages} outdated packages` },
              { text: formatTimeAgo(lastCheckTime) },
            ]}
          />
        </List.Section>
      )}

      {hasEnabledManagers &&
        hasVisibleResults &&
        filteredSections.map((section) => (
          <StatusSection
            key={section.title}
            title={section.title}
            items={section.items}
            defsById={defsById}
            allowUpgradeAll={allowUpgradeAll}
            dryRunMode={prefs.dryRunMode}
            backupBeforeUpgrade={prefs.backupBeforeUpgrade}
            showUpdateDetails={prefs.showUpdateDetails}
            sortBy={prefs.sortBy}
            skipMajorVersions={prefs.skipMajorVersions}
            compactMode={prefs.compactMode}
            onUpgrade={handleUpgrade}
            onUpgradeAll={handleUpgradeAll}
            onRefresh={() => {
              void refreshStatuses();
            }}
            availability={availability}
          />
        ))}

      {hasEnabledManagers && !hasVisibleResults && !isLoading && (
        <List.EmptyView
          icon={totalOutdated === 0 ? Icon.CheckCircle : Icon.Warning}
          title={
            totalOutdated === 0
              ? "All enabled ecosystems are up to date"
              : `No results for ${filterLabel}`
          }
          description={emptyStateDescription}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  void refreshStatuses();
                }}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {!hasEnabledManagers && !isLoading && (
        <List.EmptyView
          icon={Icon.Gear}
          title="No package managers enabled"
          description="Open Extension Preferences (⌘,) to enable the ecosystems you want to track."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {prefs.showLastCheckTime && lastCheckTime > 0 && (
        <List.Section title="Status">
          <List.Item
            title="Last Checked"
            subtitle={formatTimeAgo(lastCheckTime)}
            icon={Icon.Clock}
            accessories={[
              {
                tag: {
                  value: `${totalPackages} outdated`,
                  color: totalPackages > 0 ? Color.Orange : Color.Green,
                },
              },
              ...(totalErrors > 0
                ? [
                    {
                      tag: {
                        value: `${totalErrors} error(s)`,
                        color: Color.Red,
                      },
                    },
                  ]
                : []),
            ]}
          />
        </List.Section>
      )}
    </List>
  );
}
