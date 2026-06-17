import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useRef, useState } from "react";
import { ScanResult, scanAll } from "./utils/coordinator";
import { CliPackage, InstalledApp, Source, UpdateInfo } from "./utils/types";
import {
  installCask,
  upgradeCask,
  upgradeFormula,
} from "./utils/sources/homebrew";
import { upgradeMas } from "./utils/sources/mas";
import { openAppForSparkleUpdate } from "./utils/sources/sparkle";
import {
  upgradeGem,
  upgradeNpm,
  upgradePip,
} from "./utils/sources/cli-managers";
import { downloadAndInstall } from "./utils/updater";
import { shortenVersion } from "./utils/version";
import {
  appBundleSize,
  buildAppDetailMarkdown,
  formatBytes,
  formatDate,
} from "./utils/detail";
import { hostnameOf, navigationTitle, timeOfDay } from "./utils/format";
import { SOURCE_META } from "./utils/source-meta";
import * as fs from "fs";
import { isOnboarded, resetOnboarding } from "./utils/onboarding-store";
import Onboarding from "./components/Onboarding";
import {
  clearScanCache,
  loadScanCache,
  saveScanCache,
} from "./utils/scan-cache";
import {
  getHistory,
  HistoryEntry,
  recordHistory,
} from "./utils/update-history";
import {
  Adoptable,
  dismissAdoption,
  getAdoptableApps,
  resolveBinaries,
  runKnownInstall,
  undismissAdoption,
} from "./utils/adoption";
import { getKnownInstall } from "./utils/known-installs";
import { openHomepage, openInAppStore, openInTerminal } from "./utils/external";
import {
  getIgnoreStates,
  ignoreApp,
  IgnoreState,
  snoozeApp,
  unignoreApp,
} from "./utils/ignored";
import AdoptApps from "./components/AdoptApps";
import CustomCaskForm from "./components/CustomCaskForm";
import MasSearch from "./components/MasSearch";
import SparkleFeedForm from "./components/SparkleFeedForm";
import HomebrewMissing from "./components/HomebrewMissing";
import CliRow from "./components/rows/CliRow";
import HistoryView from "./components/views/HistoryView";
import HiddenView from "./components/views/HiddenView";
import Help from "./components/Help";
import { isHomebrewInstalled } from "./utils/sources/homebrew";

// Three views, period. "Updates" is the whole point; "Library" is everything
// installed (browse + adopt); "Activity" is history + what you've hidden. Source
// filtering lives on each row (badge) and via search — it was never worth a
// top-level nav slot.
type Filter = "updates" | "library" | "activity";

// SOURCE_META lives in utils/source-meta.ts so item components can import it directly.

export default function MacUpdater() {
  const { push } = useNavigation();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [adoptable, setAdoptable] = useState<Adoptable[]>([]);
  const [ignoreStates, setIgnoreStates] = useState<IgnoreState[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("updates");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelected(appPath: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(appPath)) next.delete(appPath);
      else next.add(appPath);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function updateSelected() {
    if (!scan || selected.size === 0) return;
    const queue = scan.apps.filter(
      (a) => a.hasUpdate && selected.has(a.app.appPath),
    );
    if (queue.length === 0) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${queue.length} app${queue.length === 1 ? "" : "s"}…`,
    });
    let ok = 0;
    let fail = 0;
    for (const info of queue) {
      toast.title = `Updating ${info.app.name} (${ok + fail + 1}/${queue.length})…`;
      try {
        await updateApp(info);
        ok++;
      } catch {
        fail++;
      }
    }
    toast.style = fail === 0 ? Toast.Style.Success : Toast.Style.Failure;
    toast.title =
      fail === 0 ? `${ok} updated` : `${ok} updated · ${fail} failed`;
    clearSelection();
  }

  // First-run flow — guard against any duplicate push (effect re-fire, navigation
  // pop side-effects, etc). Order matters: if Homebrew is missing we show that
  // setup screen first (the most common blocker), then onboarding after.
  const firstRunPushed = useRef(false);
  useEffect(() => {
    if (firstRunPushed.current) return;
    firstRunPushed.current = true;
    (async () => {
      const onboarded = await isOnboarded();
      if (!isHomebrewInstalled()) {
        push(<HomebrewMissing onContinue={() => undefined} />);
        return;
      }
      if (!onboarded) {
        push(<Onboarding onDone={() => undefined} />);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openOnboarding() {
    await resetOnboarding();
    push(<Onboarding onDone={() => undefined} />);
  }

  async function openUpdateEverything() {
    try {
      await launchCommand({
        name: "update-everything",
        type: LaunchType.UserInitiated,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't open Update Everything",
        message: String(e),
      });
    }
  }

  /** Full scan with on-screen toast — used for explicit refresh actions. */
  async function load() {
    return doScan({ silent: false });
  }

  /** Clear all caches and do a hard rescan. For when state changed outside Raycast. */
  async function forceRescan() {
    clearScanCache();
    setScan(null);
    setAdoptable([]);
    return doScan({ silent: false });
  }

  // Don't trigger a background refresh if the cache is younger than this (avoids
  // wasted scans when the user opens the extension multiple times back-to-back).
  const BACKGROUND_REFRESH_FLOOR_MS = 5 * 60 * 1000;

  /** Used on first mount: read disk cache instantly, then refresh in the background. */
  async function loadFromCacheThenRefresh() {
    const cached = loadScanCache();
    if (cached) {
      // Render the cached result immediately for an instant open.
      setScan(cached.scan);
      setAdoptable(await getAdoptableApps(cached.scan));
      setIgnoreStates(await getIgnoreStates());
      setHistory(getHistory(50));
      setIsLoading(false);
      // Refresh in the background only if the cache is meaningfully old.
      if (cached.age > BACKGROUND_REFRESH_FLOOR_MS) {
        doScan({ silent: true });
      }
    } else {
      // No cache — first run or stale. Do a full visible scan.
      doScan({ silent: false });
    }
  }

  async function doScan(opts: { silent: boolean }) {
    if (!opts.silent) setIsLoading(true);
    const toast = opts.silent
      ? null
      : await showToast({ style: Toast.Style.Animated, title: "Scanning…" });
    try {
      const result = await scanAll();
      setScan(result);
      saveScanCache(result);
      const ad = await getAdoptableApps(result);
      setAdoptable(ad);
      setIgnoreStates(await getIgnoreStates());
      setHistory(getHistory(50));
      const updateCount =
        result.apps.filter((a) => a.hasUpdate).length +
        result.cliPackages.length;
      if (toast) {
        toast.style = Toast.Style.Success;
        if (updateCount === 0 && ad.length > 0) {
          toast.title = `Up to date · ${ad.length} could be adopted`;
        } else if (updateCount === 0) {
          toast.title = "Up to date";
        } else {
          toast.title = `${updateCount} update${updateCount === 1 ? "" : "s"} available`;
        }
      }
    } catch (e) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Scan failed";
        toast.message = String(e);
      }
    } finally {
      if (!opts.silent) setIsLoading(false);
    }
  }

  async function hideApp(app: InstalledApp) {
    await ignoreApp(app.bundleId);
    await showToast({
      style: Toast.Style.Success,
      title: `${app.name} hidden`,
      message: "It won't show in Updates or Adoptable anymore.",
    });
    await load();
  }

  async function snoozeAppAction(app: InstalledApp, days: number) {
    await snoozeApp(app.bundleId, days);
    await showToast({
      style: Toast.Style.Success,
      title: `${app.name} snoozed for ${days} day${days === 1 ? "" : "s"}`,
      message: "It'll resurface automatically when the snooze expires.",
    });
    await load();
  }

  async function unhideApp(app: InstalledApp) {
    await unignoreApp(app.bundleId);
    await undismissAdoption(app.bundleId);
    await showToast({
      style: Toast.Style.Success,
      title: `${app.name} restored`,
    });
    await load();
  }

  function openAdoptionFlow() {
    if (adoptable.length === 0) {
      showToast({
        style: Toast.Style.Success,
        title: "Nothing to adopt — every match is already brew-managed",
      });
      return;
    }
    push(<AdoptApps adoptable={adoptable} onDone={() => load()} />);
  }

  useEffect(() => {
    loadFromCacheThenRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateApp(info: UpdateInfo) {
    setBusyId(info.app.appPath);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${info.app.name}…`,
    });
    try {
      let result;
      switch (info.source) {
        case "homebrew-cask":
          result = await upgradeCask(
            info.caskToken ?? info.app.name.toLowerCase(),
            info.app.name,
            (label) => {
              toast.title = `${info.app.name}: ${label}`;
            },
          );
          break;
        case "homebrew-formula":
          result = await upgradeFormula(
            info.caskToken ?? info.app.name.toLowerCase(),
          );
          break;
        case "mas":
          if (info.masId) result = await upgradeMas(info.masId, info.app.name);
          else result = { success: false, error: "Missing MAS id" };
          break;
        case "sparkle":
        case "electron":
        case "github":
        case "devmate": {
          if (!info.downloadUrl) {
            // No direct download — open the app and let its own updater finish
            await openAppForSparkleUpdate(info.app.appPath);
            toast.style = Toast.Style.Success;
            toast.title = `Opened ${info.app.name} — finish the update there`;
            return;
          }
          const r = await downloadAndInstall({
            downloadUrl: info.downloadUrl,
            targetAppPath: info.app.appPath,
            appName: info.app.name,
            onProgress: (label) => {
              toast.title = `${info.app.name}: ${label}`;
            },
          });
          result = { success: r.success, error: r.error };
          break;
        }
        default:
          result = { success: false, error: "Unsupported source" };
      }

      if (result.success) {
        recordHistory({
          name: info.app.name,
          bundleId: info.app.bundleId,
          source: info.source,
          fromVersion: info.app.version,
          toVersion: info.latestVersion,
          trigger: "manual",
        });
        toast.style = Toast.Style.Success;
        toast.title = `${info.app.name} updated`;
        await load();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Couldn't update ${info.app.name}`;
        toast.message = "error" in result ? result.error : undefined;
      }
    } finally {
      setBusyId(null);
    }
  }

  async function updateCli(pkg: CliPackage) {
    setBusyId(pkg.id);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${pkg.name}…`,
    });
    let result;
    switch (pkg.source) {
      case "homebrew-formula":
        result = await upgradeFormula(pkg.name);
        break;
      case "npm":
        result = await upgradeNpm(pkg.name);
        break;
      case "pip":
        result = await upgradePip(pkg.name);
        break;
      case "gem":
        result = await upgradeGem(pkg.name);
        break;
      default:
        result = { success: false, error: "Unsupported" };
    }
    if (result.success) {
      recordHistory({
        name: pkg.name,
        source: pkg.source,
        fromVersion: pkg.currentVersion,
        toVersion: pkg.latestVersion,
        trigger: "manual",
      });
      toast.style = Toast.Style.Success;
      toast.title = `${pkg.name} updated`;
      await load();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't update ${pkg.name}`;
      toast.message = "error" in result ? result.error : undefined;
    }
    setBusyId(null);
  }

  async function adoptApp(app: InstalledApp, caskToken: string) {
    // If this bundle has a curated install (third-party tap or MAS), use that path
    const known = getKnownInstall(app.bundleId);

    const confirmMsg = known
      ? known.kind === "mas"
        ? `Installs from the Mac App Store via mas. Updates flow through the App Store from now on.`
        : `Adds the third-party Homebrew tap and installs ${caskToken}. The existing copy gets replaced.`
      : `Installs the Homebrew cask "${caskToken}". The existing copy gets replaced with Homebrew's, and updates flow through brew from now on.`;

    const confirmed = await confirmAlert({
      title: `Adopt ${app.name}?`,
      message: confirmMsg,
      primaryAction: { title: "Adopt", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    setBusyId(app.appPath);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adopting ${app.name}…`,
    });
    const r = known
      ? await runKnownInstall(known, app.name)
      : await installCask(caskToken);
    if (r.success) {
      toast.style = Toast.Style.Success;
      toast.title = `${app.name} is now managed`;
      await load();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't adopt ${app.name}`;
      toast.message = r.error;
      // Offer an in-toast action to bail out to Terminal, App Store, or the
      // project homepage. Homepage takes priority when the failure is a
      // pulled-CDN 404 — retrying brew won't help, and the homepage almost
      // always has a working direct download (this is the KDE Connect case).
      const looksLikeCdn404 = /404|curl.*\(56\)|download failed/i.test(
        r.error ?? "",
      );
      if (known?.kind === "mas" && known.masId) {
        toast.primaryAction = {
          title: "Open in App Store",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => openInAppStore(known.masId!),
        };
        toast.secondaryAction = {
          title: "Run in Terminal",
          shortcut: { modifiers: ["cmd"], key: "t" },
          onAction: () =>
            openInTerminal(resolveBinaries(known.commands.join(" && "))),
        };
      } else if (known?.homepageUrl && looksLikeCdn404) {
        toast.primaryAction = {
          title: "Open Project Homepage",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => openHomepage(known.homepageUrl!),
        };
        toast.secondaryAction = {
          title: "Run in Terminal",
          shortcut: { modifiers: ["cmd"], key: "t" },
          onAction: () =>
            openInTerminal(resolveBinaries(known.commands.join(" && "))),
        };
      } else {
        toast.primaryAction = {
          title: "Run in Terminal",
          shortcut: { modifiers: ["cmd"], key: "t" },
          onAction: () => {
            const cmd = known
              ? known.commands.join(" && ")
              : `/opt/homebrew/bin/brew install --cask --force "${caskToken}"`;
            // resolveBinaries rewrites the /opt/homebrew vs /usr/local brew path
            // to whichever this Mac actually has (Intel vs Apple Silicon).
            openInTerminal(resolveBinaries(cmd));
          },
        };
        if (known?.homepageUrl) {
          toast.secondaryAction = {
            title: "Open Project Homepage",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => openHomepage(known.homepageUrl!),
          };
        }
      }
    }
    setBusyId(null);
  }

  const updatesCount =
    (scan?.apps.filter((a) => a.hasUpdate).length ?? 0) +
    (scan?.cliPackages.length ?? 0);

  // Counts for the three views.
  const counts: Record<Filter, number> = {
    updates: updatesCount,
    library: scan
      ? scan.apps.length +
        scan.unmanaged.length +
        scan.allInstalledPackages.length
      : 0,
    activity: (scan?.ignoredApps.length ?? 0) + history.length,
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={navigationTitle(
        scan,
        updatesCount,
        adoptable.length,
        selected.size,
      )}
      searchBarPlaceholder="Search…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        >
          {dropdownItem(
            "Updates",
            "updates",
            Icon.ArrowClockwise,
            counts.updates,
            {
              alwaysShow: true,
            },
          )}
          {dropdownItem(
            "Library",
            "library",
            Icon.AppWindowGrid2x2,
            counts.library,
            {
              alwaysShow: true,
            },
          )}
          {dropdownItem("Activity", "activity", Icon.Clock, counts.activity, {
            alwaysShow: true,
          })}
        </List.Dropdown>
      }
    >
      {filter === "updates" && <>{renderUpdates()}</>}
      {filter === "library" && (
        <>
          {renderAllApps()}
          {renderAllPackages()}
        </>
      )}
      {filter === "activity" && (
        <>
          {renderHistory()}
          {renderHidden()}
        </>
      )}

      {!isLoading && updatesCount === 0 && filter === "updates" && (
        <List.EmptyView
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          title="Up to date"
          description={
            adoptable.length > 0
              ? `${adoptable.length} app${adoptable.length === 1 ? "" : "s"} could be adopted to Homebrew · ⌘⇧A`
              : `${scan?.apps.length ?? 0} apps managed · last scanned ${scan ? timeOfDay(scan.scannedAt) : "—"}`
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={load}
              />
              {adoptable.length > 0 && (
                <Action
                  title="Adopt to Homebrew"
                  icon={Icon.Mug}
                  onAction={openAdoptionFlow}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              )}
              <Action
                title="Configure Auto-Update…"
                icon={Icon.Cog}
                onAction={() => openExtensionPreferences()}
              />
              <Action
                title="Help & Keyboard Shortcuts"
                icon={Icon.QuestionMark}
                onAction={() => push(<Help />)}
                shortcut={{ modifiers: ["cmd"], key: "/" }}
              />
              <Action
                title="Show Onboarding"
                icon={Icon.Book}
                onAction={openOnboarding}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );

  function renderUpdates() {
    if (!scan) return null;
    const updates = scan.apps.filter((a) => a.hasUpdate);
    const total = updates.length + scan.cliPackages.length;
    const sections: React.ReactElement[] = [];

    // Banners section — Selection / Update Everything / Adopt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const banners: any[] = [];

    // Selection banner takes priority when something is selected
    if (selected.size > 0) {
      banners.push(
        <List.Item
          key="selection-banner"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Blue }}
          title={`Update ${selected.size} selected`}
          subtitle="Runs the selected updates one after another"
          accessories={[{ tag: { value: "⏎", color: Color.Blue } }]}
          actions={
            <ActionPanel>
              <Action
                title="Update Selected"
                icon={Icon.Rocket}
                onAction={updateSelected}
              />
              <Action
                title="Clear Selection"
                icon={Icon.XMarkCircle}
                onAction={clearSelection}
                shortcut={{ modifiers: ["cmd"], key: "escape" }}
              />
            </ActionPanel>
          }
        />,
      );
    }

    if (total > 0) {
      const summary =
        updates.length && scan.cliPackages.length
          ? `${updates.length} app${updates.length === 1 ? "" : "s"} and ${scan.cliPackages.length} package${scan.cliPackages.length === 1 ? "" : "s"}`
          : updates.length
            ? `${updates.length} app${updates.length === 1 ? "" : "s"}`
            : `${scan.cliPackages.length} package${scan.cliPackages.length === 1 ? "" : "s"}`;
      banners.push(
        <List.Item
          key="update-all-banner"
          icon={{ source: Icon.Rocket, tintColor: Color.Blue }}
          title="Update everything"
          subtitle={summary}
          accessories={[{ tag: { value: "⌘⇧U", color: Color.Blue } }]}
          actions={
            <ActionPanel>
              <Action
                title="Update Everything"
                icon={Icon.Rocket}
                onAction={openUpdateEverything}
              />
              {adoptable.length > 0 && (
                <Action
                  title={`Adopt ${adoptable.length} App${adoptable.length === 1 ? "" : "s"} to Homebrew`}
                  icon={Icon.Mug}
                  onAction={openAdoptionFlow}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={load}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Force Rescan (Clear Cache)"
                icon={Icon.RotateAntiClockwise}
                onAction={forceRescan}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              <Action
                title="Show Onboarding"
                icon={Icon.Book}
                onAction={openOnboarding}
              />
            </ActionPanel>
          }
        />,
      );
    }
    if (adoptable.length > 0) {
      banners.push(
        <List.Item
          key="adopt-banner"
          icon={{ source: Icon.Mug, tintColor: Color.Orange }}
          title="Adopt to Homebrew"
          subtitle={`${adoptable.length} app${adoptable.length === 1 ? "" : "s"} ready · brings them under brew for auto-updates`}
          accessories={[{ tag: { value: "⌘⇧A", color: Color.Orange } }]}
          actions={
            <ActionPanel>
              <Action
                title={`Adopt ${adoptable.length} App${adoptable.length === 1 ? "" : "s"}`}
                icon={Icon.Mug}
                onAction={openAdoptionFlow}
              />
              {total > 0 && (
                <Action
                  title="Update Everything"
                  icon={Icon.Rocket}
                  onAction={openUpdateEverything}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={load}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Force Rescan (Clear Cache)"
                icon={Icon.RotateAntiClockwise}
                onAction={forceRescan}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />,
      );
    }
    if (banners.length > 0) {
      sections.push(
        <List.Section key="banners">
          <>{banners}</>
        </List.Section>,
      );
    }

    if (updates.length > 0) {
      sections.push(
        <List.Section key="apps" title="Apps" subtitle={`${updates.length}`}>
          {updates.map((info) => renderAppItem(info))}
        </List.Section>,
      );
    }

    if (scan.cliPackages.length > 0) {
      sections.push(
        <List.Section
          key="cli"
          title="Packages"
          subtitle={`${scan.cliPackages.length}`}
        >
          {scan.cliPackages.map((p) => renderCliItem(p))}
        </List.Section>,
      );
    }

    // Inline adoption opportunities — show the actual apps so user can adopt individually
    if (adoptable.length > 0) {
      sections.push(
        <List.Section
          key="adoptable"
          title="Available on Homebrew"
          subtitle={`${adoptable.length}`}
        >
          <>
            {adoptable.map(({ app, caskToken }) =>
              renderAdoptableItem(app, caskToken),
            )}
          </>
        </List.Section>,
      );
    }

    return sections;
  }

  function renderAdoptableItem(
    app: InstalledApp,
    caskToken: string,
  ): React.ReactNode {
    const isBusy = busyId === app.appPath;
    const known = getKnownInstall(app.bundleId);
    // Pretty install line + accessory tag — depends on what kind of install this is
    const isMas = known?.kind === "mas";
    const isTap = known?.kind === "brew-tap";
    const isDisabled = !!known?.disabled;
    const installLine = isDisabled
      ? "Manual install — open project page"
      : isMas
        ? `Open App Store · id ${known!.masId}`
        : isTap
          ? `brew install --cask ${caskToken}`
          : `brew install --cask ${caskToken}`;
    const tagLabel = isDisabled
      ? "Manual"
      : isMas
        ? "App Store"
        : isTap
          ? "Homebrew Tap"
          : caskToken;
    const tagIcon = isDisabled ? Icon.Globe : isMas ? Icon.Store : Icon.Mug;
    const tagColor = isDisabled
      ? Color.SecondaryText
      : isMas
        ? Color.Blue
        : Color.Orange;
    return (
      <List.Item
        key={`adopt-${app.appPath}`}
        icon={{ fileIcon: app.appPath }}
        title={app.name}
        subtitle={showDetail ? undefined : `${app.version}  ·  ${installLine}`}
        accessories={[
          isBusy
            ? { icon: Icon.ArrowClockwise }
            : {
                tag: { value: tagLabel, color: tagColor },
                icon: tagIcon,
                tooltip: installLine,
              },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={
                isDisabled
                  ? `Open ${app.name} Download Page`
                  : isMas
                    ? `Open ${app.name} in App Store`
                    : `Adopt ${app.name} to Homebrew`
              }
              icon={tagIcon}
              onAction={() => adoptApp(app, caskToken)}
            />
            <Action
              title={`Adopt All ${adoptable.length} Now`}
              icon={Icon.Rocket}
              onAction={openAdoptionFlow}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            <Action
              title="Use Different Cask Name…"
              icon={Icon.Pencil}
              onAction={() =>
                push(<CustomCaskForm app={app} onDone={() => load()} />)
              }
              shortcut={{ modifiers: ["cmd"], key: "k" }}
            />
            <Action
              title="Search Mac App Store…"
              icon={Icon.Store}
              onAction={() =>
                push(<MasSearch app={app} onDone={() => load()} />)
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action
              title="Don't Suggest Adopting This App"
              icon={Icon.MinusCircle}
              onAction={async () => {
                await dismissAdoption(app.bundleId);
                await load();
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            />
            <Action
              title="Hide This App Entirely"
              icon={Icon.EyeDisabled}
              style={Action.Style.Destructive}
              onAction={() => hideApp(app)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
            <Action
              title="Open App"
              icon={Icon.AppWindow}
              onAction={() => openAppForSparkleUpdate(app.appPath)}
            />
            <ActionPanel.Section>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={load}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Force Rescan (Clear Cache)"
                icon={Icon.RotateAntiClockwise}
                onAction={forceRescan}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              {!isMas && !isTap && (
                <Action.OpenInBrowser
                  title="View Cask Page"
                  url={`https://formulae.brew.sh/cask/${caskToken}`}
                />
              )}
              {isMas && known?.masId && (
                <Action
                  title="Open in App Store"
                  icon={Icon.Store}
                  onAction={() => openInAppStore(known.masId!)}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function renderAllApps() {
    if (!scan) return null;
    const sections: React.ReactElement[] = [];
    const withUpdates = scan.apps.filter((a) => a.hasUpdate);
    const upToDate = scan.apps.filter((a) => !a.hasUpdate);

    if (withUpdates.length > 0) {
      sections.push(
        <List.Section
          key="upd"
          title="Update Available"
          subtitle={`${withUpdates.length}`}
        >
          {withUpdates.map((info) => renderAppItem(info))}
        </List.Section>,
      );
    }
    if (upToDate.length > 0) {
      sections.push(
        <List.Section
          key="ok"
          title="Up to Date"
          subtitle={`${upToDate.length}`}
        >
          {upToDate.map((info) => renderAppItem(info))}
        </List.Section>,
      );
    }
    if (scan.unmanaged.length > 0) {
      sections.push(
        <List.Section
          key="unm"
          title="No Source"
          subtitle={`${scan.unmanaged.length}`}
        >
          {scan.unmanaged.map((app) => renderUnmanagedItem(app))}
        </List.Section>,
      );
    }
    return sections;
  }

  function renderHidden() {
    if (!scan) return null;
    return (
      <HiddenView
        scan={scan}
        ignoreStates={ignoreStates}
        onUnhide={unhideApp}
        onRefresh={load}
        onForceRescan={forceRescan}
      />
    );
  }

  function renderHistory() {
    return <HistoryView history={history} onRefresh={load} />;
  }

  function renderAllPackages() {
    if (!scan) return null;
    if (scan.allInstalledPackages.length === 0) {
      return (
        <List.EmptyView
          icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
          title="No packages installed"
          description="Install via brew, npm, pip, or gem to see them here."
        />
      );
    }
    const bySource: Record<string, typeof scan.allInstalledPackages> = {};
    for (const p of scan.allInstalledPackages) {
      if (!bySource[p.source]) bySource[p.source] = [];
      bySource[p.source].push(p);
    }
    const outdatedKeys = new Set(
      scan.cliPackages.map((p) => `${p.source}:${p.name}`),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: any[] = [];
    for (const [src, pkgs] of Object.entries(bySource)) {
      const meta = SOURCE_META[src as Source];
      const outdatedCount = pkgs.filter((p) =>
        outdatedKeys.has(`${p.source}:${p.name}`),
      ).length;
      sections.push(
        <List.Section
          key={src}
          title={meta.label}
          subtitle={`${pkgs.length}${outdatedCount > 0 ? `  ·  ${outdatedCount} outdated` : ""}`}
        >
          {pkgs.map((p) => renderCliItem(p))}
        </List.Section>,
      );
    }
    return <>{sections}</>;
  }

  function renderAppItem(info: UpdateInfo) {
    const meta = SOURCE_META[info.source];
    const isBusy = busyId === info.app.appPath;
    const isSelected = selected.has(info.app.appPath);

    const accessories: List.Item.Accessory[] = [];
    if (isSelected) {
      accessories.push({
        icon: { source: Icon.CheckCircle, tintColor: Color.Blue },
        tooltip: "Selected · ⏎ to run",
      });
    }
    if (isBusy) {
      accessories.push({ icon: Icon.ArrowClockwise, tooltip: "Working…" });
    } else if (info.hasUpdate) {
      accessories.push({
        tag: { value: shortenVersion(info.latestVersion), color: Color.Green },
        tooltip: `${meta.label} · ${info.app.version} → ${info.latestVersion}`,
      });
    } else {
      accessories.push({
        icon: { source: Icon.Checkmark, tintColor: Color.SecondaryText },
        tooltip: `Up to date · ${meta.label}`,
      });
    }

    return (
      <List.Item
        key={info.app.appPath}
        icon={{ fileIcon: info.app.appPath }}
        title={info.app.name}
        subtitle={showDetail ? undefined : info.app.version}
        accessories={accessories}
        detail={showDetail ? <>{renderAppDetail(info)}</> : undefined}
        actions={<>{renderAppActions(info)}</>}
      />
    );
  }

  function renderAppDetail(info: UpdateInfo): React.ReactNode {
    const meta = SOURCE_META[info.source];
    // Compute metadata derived from the .app on disk. These calls are fast for
    // typical app sizes (~50-500 MB) and only run when the detail pane is open.
    let installedSize = "";
    let installedDate = "";
    try {
      installedSize = formatBytes(appBundleSize(info.app.appPath));
      installedDate = formatDate(fs.statSync(info.app.appPath).mtimeMs);
    } catch {
      // ignore — show "—" below
    }
    return (
      <List.Item.Detail
        markdown={buildAppDetailMarkdown(info)}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Installed version"
              text={info.app.version}
            />
            <List.Item.Detail.Metadata.Label
              title="Latest version"
              text={info.latestVersion}
            />
            {info.app.buildNumber &&
              info.app.buildNumber !== info.app.version && (
                <List.Item.Detail.Metadata.Label
                  title="Build"
                  text={info.app.buildNumber}
                />
              )}
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.TagList title="Source">
              <List.Item.Detail.Metadata.TagList.Item
                text={meta.label}
                color={meta.color}
                icon={meta.icon}
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Label
              title="Bundle ID"
              text={info.app.bundleId || "—"}
            />
            <List.Item.Detail.Metadata.Label
              title="Size"
              text={installedSize || "—"}
            />
            <List.Item.Detail.Metadata.Label
              title="Last modified"
              text={installedDate || "—"}
            />
            {info.releaseNotesUrl && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Link
                  title="Release notes"
                  target={info.releaseNotesUrl}
                  text={hostnameOf(info.releaseNotesUrl)}
                />
              </>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function renderAppActions(info: UpdateInfo): React.ReactNode {
    const primaryLabel =
      info.source === "homebrew-cask" ||
      info.source === "homebrew-formula" ||
      info.source === "mas"
        ? `Update ${info.app.name}`
        : info.downloadUrl
          ? `Download & Install`
          : `Open ${info.app.name} to Update`;

    const selectionActive = selected.size > 0;
    const isSelected = selected.has(info.app.appPath);

    return (
      <ActionPanel>
        {/* When a selection is active, the primary action runs the queue. */}
        {selectionActive && (
          <Action
            title={`Update Selected (${selected.size})`}
            icon={Icon.Rocket}
            onAction={updateSelected}
          />
        )}
        {info.hasUpdate && (
          <Action
            title={
              selectionActive ? `Update Just ${info.app.name}` : primaryLabel
            }
            icon={Icon.ArrowClockwise}
            onAction={() => updateApp(info)}
          />
        )}
        {info.hasUpdate && (
          <Action
            title={isSelected ? "Deselect" : "Select for Batch Update"}
            icon={isSelected ? Icon.MinusCircle : Icon.CheckCircle}
            onAction={() => toggleSelected(info.app.appPath)}
            shortcut={{ modifiers: [], key: "space" }}
          />
        )}
        {selectionActive && (
          <Action
            title="Clear Selection"
            icon={Icon.XMarkCircle}
            onAction={clearSelection}
            shortcut={{ modifiers: ["cmd"], key: "escape" }}
          />
        )}
        <Action
          title="Open App"
          icon={Icon.AppWindow}
          onAction={() => openAppForSparkleUpdate(info.app.appPath)}
        />

        {/* Surface adopt-to-Homebrew when there's a cask AND we're not already using it */}
        {info.app.suggestedCask && !info.app.managedByBrew && (
          <Action
            title={`Switch to Homebrew (${info.app.suggestedCask})`}
            icon={Icon.Mug}
            onAction={() => adoptApp(info.app, info.app.suggestedCask!)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
        )}

        <ActionPanel.Section>
          <Action
            title="Update Everything"
            icon={Icon.Rocket}
            onAction={openUpdateEverything}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={load}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Force Rescan (Clear Cache)"
            icon={Icon.RotateAntiClockwise}
            onAction={forceRescan}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            title={showDetail ? "Hide Detail" : "Show Detail"}
            icon={Icon.Sidebar}
            onAction={() => setShowDetail(!showDetail)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {info.releaseNotesUrl && (
            <Action.OpenInBrowser
              title="View Release Notes"
              url={info.releaseNotesUrl}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}
          <ActionPanel.Submenu
            title="Snooze Update"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          >
            <Action
              title="For 1 Day"
              onAction={() => snoozeAppAction(info.app, 1)}
            />
            <Action
              title="For 7 Days"
              onAction={() => snoozeAppAction(info.app, 7)}
            />
            <Action
              title="For 30 Days"
              onAction={() => snoozeAppAction(info.app, 30)}
            />
            <Action
              title="For 90 Days"
              onAction={() => snoozeAppAction(info.app, 90)}
            />
          </ActionPanel.Submenu>
          <Action
            title="Hide This App Forever"
            icon={Icon.EyeDisabled}
            style={Action.Style.Destructive}
            onAction={() => hideApp(info.app)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action.CopyToClipboard
            title="Copy Bundle ID"
            content={info.app.bundleId}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
          <Action
            title="Help & Keyboard Shortcuts"
            icon={Icon.QuestionMark}
            onAction={() => push(<Help />)}
            shortcut={{ modifiers: ["cmd"], key: "/" }}
          />
          <Action
            title="Configure Auto-Update…"
            icon={Icon.Cog}
            onAction={() => openExtensionPreferences()}
          />
          <Action
            title="Show Onboarding"
            icon={Icon.Book}
            onAction={openOnboarding}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function renderUnmanagedItem(app: InstalledApp) {
    const isBusy = busyId === app.appPath;
    const known = getKnownInstall(app.bundleId);
    const accessory: List.Item.Accessory = isBusy
      ? { icon: Icon.ArrowClockwise }
      : known?.kind === "mas"
        ? {
            tag: { value: "App Store", color: Color.Blue },
            icon: Icon.Store,
            tooltip: `mas install ${known.masId}`,
          }
        : known?.kind === "brew-tap"
          ? {
              tag: { value: "Homebrew Tap", color: Color.Orange },
              icon: Icon.Mug,
              tooltip: known.description,
            }
          : app.suggestedCask
            ? {
                tag: { value: app.suggestedCask, color: Color.Orange },
                icon: Icon.Mug,
                tooltip: `brew install --cask ${app.suggestedCask}`,
              }
            : {
                icon: {
                  source: Icon.QuestionMark,
                  tintColor: Color.SecondaryText,
                },
                tooltip: "No update source",
              };

    return (
      <List.Item
        key={app.appPath}
        icon={{ fileIcon: app.appPath }}
        title={app.name}
        subtitle={showDetail ? undefined : app.version}
        accessories={[accessory]}
        detail={
          showDetail ? (
            <List.Item.Detail
              markdown={
                app.suggestedCask
                  ? `# ${app.name}\n\nA Homebrew cask matches this app:\n\n\`\`\`\nbrew install --cask ${app.suggestedCask}\n\`\`\`\n\nAdopting will replace the current copy with Homebrew's managed version. From then on, it updates with everything else.`
                  : `# ${app.name}\n\nNo update source detected. Try:\n\n- Open the app — many self-check on launch\n- Search Homebrew for a cask\n- Visit the homepage to update manually`
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Installed"
                    text={app.version}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Bundle ID"
                    text={app.bundleId}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  {app.suggestedCask ? (
                    <List.Item.Detail.Metadata.TagList title="Suggestion">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`brew · ${app.suggestedCask}`}
                        color={Color.Orange}
                        icon={Icon.Mug}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.TagList title="Source">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="None found"
                        color={Color.SecondaryText}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          ) : undefined
        }
        actions={
          <ActionPanel>
            {known ? (
              <Action
                title={
                  known.kind === "mas"
                    ? `Install via App Store`
                    : `Install via Homebrew Tap`
                }
                icon={known.kind === "mas" ? Icon.Store : Icon.Mug}
                onAction={() =>
                  adoptApp(app, known.caskToken ?? `mas:${known.masId}`)
                }
              />
            ) : app.suggestedCask ? (
              <Action
                title={`Adopt to Homebrew`}
                icon={Icon.Mug}
                onAction={() => adoptApp(app, app.suggestedCask!)}
              />
            ) : null}
            <Action
              title="Adopt with Custom Cask…"
              icon={Icon.Pencil}
              onAction={() =>
                push(<CustomCaskForm app={app} onDone={() => load()} />)
              }
              shortcut={{ modifiers: ["cmd"], key: "k" }}
            />
            <Action
              title="Search Mac App Store…"
              icon={Icon.Store}
              onAction={() =>
                push(<MasSearch app={app} onDone={() => load()} />)
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action
              title="Wire up Sparkle Feed…"
              icon={Icon.Stars}
              onAction={() =>
                push(<SparkleFeedForm app={app} onDone={() => load()} />)
              }
              shortcut={{ modifiers: ["cmd"], key: "j" }}
            />
            <Action.OpenInBrowser
              title="Search Homebrew Casks"
              url={`https://formulae.brew.sh/cask/?q=${encodeURIComponent(app.name)}`}
              icon={Icon.MagnifyingGlass}
            />
            <Action
              title="Open App"
              icon={Icon.AppWindow}
              onAction={() => openAppForSparkleUpdate(app.appPath)}
            />
            <ActionPanel.Section>
              <Action
                title="Update Everything"
                icon={Icon.Rocket}
                onAction={openUpdateEverything}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={load}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Force Rescan (Clear Cache)"
                icon={Icon.RotateAntiClockwise}
                onAction={forceRescan}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              <Action
                title={showDetail ? "Hide Detail" : "Show Detail"}
                icon={Icon.Sidebar}
                onAction={() => setShowDetail(!showDetail)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action.OpenInBrowser
                title="Search Google"
                url={`https://www.google.com/search?q=${encodeURIComponent(app.name + " mac update")}`}
              />
              <ActionPanel.Submenu
                title="Snooze"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              >
                <Action
                  title="For 1 Day"
                  onAction={() => snoozeAppAction(app, 1)}
                />
                <Action
                  title="For 7 Days"
                  onAction={() => snoozeAppAction(app, 7)}
                />
                <Action
                  title="For 30 Days"
                  onAction={() => snoozeAppAction(app, 30)}
                />
                <Action
                  title="For 90 Days"
                  onAction={() => snoozeAppAction(app, 90)}
                />
              </ActionPanel.Submenu>
              <Action
                title="Hide This App Forever"
                icon={Icon.EyeDisabled}
                style={Action.Style.Destructive}
                onAction={() => hideApp(app)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />
              <Action.CopyToClipboard
                title="Copy Bundle ID"
                content={app.bundleId}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
              <Action
                title="Help & Keyboard Shortcuts"
                icon={Icon.QuestionMark}
                onAction={() => push(<Help />)}
                shortcut={{ modifiers: ["cmd"], key: "/" }}
              />
              <Action
                title="Configure Auto-Update…"
                icon={Icon.Cog}
                onAction={() => openExtensionPreferences()}
              />
              <Action
                title="Show Onboarding"
                icon={Icon.Book}
                onAction={openOnboarding}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function renderCliItem(p: CliPackage) {
    return (
      <CliRow
        key={`${p.source}-${p.id}`}
        pkg={p}
        isBusy={busyId === p.id}
        showDetail={showDetail}
        onUpdate={updateCli}
        onUpdateEverything={openUpdateEverything}
        onRefresh={load}
        onForceRescan={forceRescan}
      />
    );
  }
}

interface DropdownOpts {
  /** When true, render even with a 0 count. Use for primary filters that should always be visible. */
  alwaysShow?: boolean;
}

/** Render a count-aware Dropdown.Item; returns null when count is 0 unless alwaysShow. */
function dropdownItem(
  label: string,
  value: string,
  icon: Icon,
  count: number | undefined,
  opts: DropdownOpts = {},
) {
  if ((!count || count === 0) && !opts.alwaysShow) return null;
  const display = count && count > 0 ? `${label} · ${count}` : label;
  return (
    <List.Dropdown.Item key={value} title={display} value={value} icon={icon} />
  );
}
