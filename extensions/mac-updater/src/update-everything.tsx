import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Source, UpdateInfo, UpdateResult } from "./utils/types";
import { upgradeCask, upgradeFormula } from "./utils/sources/homebrew";
import { isMasInstalled, installMas, upgradeAllMas } from "./utils/sources/mas";
import {
  isGemAvailable,
  upgradeAllGems,
  upgradeAllNpm,
  upgradeAllPip,
} from "./utils/sources/cli-managers";
import { commandExists } from "./utils/shell";
import { downloadAndInstall } from "./utils/updater";
import { openAppForSparkleUpdate } from "./utils/sources/sparkle";
import { scanAll, ScanResult } from "./utils/coordinator";
import { recordHistory } from "./utils/update-history";
import { shortenVersion } from "./utils/version";
import { progressBar } from "./utils/format";

type TaskStatus = "pending" | "running" | "success" | "failed" | "skipped";

interface QueueTask {
  id: string;
  group: "system" | "apps" | "packages";
  source: Source;
  title: string;
  subtitle?: string;
  icon?: string; // path to app icon if available
  status: TaskStatus;
  progress?: string;
  error?: string;
  run: (onProgress: (label: string) => void) => Promise<UpdateResult>;
}

const SOURCE_ICON: Record<Source, Icon> = {
  "homebrew-cask": Icon.Mug,
  "homebrew-formula": Icon.Terminal,
  mas: Icon.Store,
  sparkle: Icon.Stars,
  electron: Icon.Bolt,
  github: Icon.Code,
  devmate: Icon.Globe,
  npm: Icon.Globe,
  pip: Icon.Code,
  gem: Icon.Star,
  unknown: Icon.QuestionMark,
};

const SOURCE_COLOR: Record<Source, Color> = {
  "homebrew-cask": Color.Orange,
  "homebrew-formula": Color.Orange,
  mas: Color.Blue,
  sparkle: Color.Purple,
  electron: Color.Yellow,
  github: Color.PrimaryText,
  devmate: Color.SecondaryText,
  npm: Color.Red,
  pip: Color.Green,
  gem: Color.Magenta,
  unknown: Color.SecondaryText,
};

// Deliberately calm copy — no random quips. The action speaks for itself.
const KICKOFF_TITLE = "Updating everything…";
const DONE_TITLE = "All done";

export default function UpdateEverything() {
  const [isScanning, setIsScanning] = useState(true);
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function loadScan() {
    setIsScanning(true);
    setDone(false);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Scanning for everything that needs an update…",
    });
    try {
      const result = await scanAll();
      setTasks(await buildQueue(result));
      toast.style = Toast.Style.Success;
      toast.title = "Scan complete";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Scan failed";
      toast.message = String(e);
    } finally {
      setIsScanning(false);
    }
  }

  useEffect(() => {
    loadScan();
  }, []);

  function patch(id: string, update: Partial<QueueTask>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...update } : t)),
    );
  }

  async function runAll() {
    if (tasks.length === 0) return;
    setRunning(true);
    setDone(false);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: KICKOFF_TITLE,
    });

    // Drive a live progress bar in the toast as tasks finish. Counts every
    // task that reaches a terminal state (done OR failed), since both represent
    // work the queue has gotten through.
    const total = tasks.length;
    let finished = 0;
    const bump = () => {
      finished++;
      toast.title = `Updating  ${progressBar(finished, total)}  (${finished}/${total})`;
    };

    const runOne = async (t: QueueTask) => {
      patch(t.id, { status: "running" });
      const result = await t.run((label) => patch(t.id, { progress: label }));
      patch(t.id, {
        status: result.success ? "success" : "failed",
        error: result.error,
        progress: undefined,
      });
      bump();
    };
    const runSerially = async (list: QueueTask[]) => {
      for (const t of list) await runOne(t);
    };

    // Every Homebrew command (casks AND formulae) shares brew's global lock, so
    // they must run one at a time — but each is its own task, so the progress
    // bar still advances per app/formula. Everything else is independent:
    // package managers fan out in parallel, app downloads run serially (to keep
    // network + admin prompts sane). All three lanes run concurrently.
    const isBrew = (t: QueueTask) =>
      t.source === "homebrew-cask" || t.source === "homebrew-formula";
    const brewLane = tasks.filter(isBrew);
    const parallelLane = tasks.filter(
      (t) => !isBrew(t) && (t.group === "system" || t.group === "packages"),
    );
    const appLane = tasks.filter((t) => !isBrew(t) && t.group === "apps");

    await Promise.all([
      runSerially(brewLane),
      ...parallelLane.map(runOne),
      runSerially(appLane),
    ]);

    setRunning(false);
    setDone(true);

    // Read fresh counts from setState ref after the loop completes
    setTasks((prev) => {
      const failed = prev.filter((t) => t.status === "failed").length;
      const success = prev.filter((t) => t.status === "success").length;
      toast.style = failed === 0 ? Toast.Style.Success : Toast.Style.Failure;
      toast.title =
        failed === 0
          ? `${DONE_TITLE} (${success} done)`
          : `${success} updated, ${failed} failed`;
      return prev;
    });
  }

  function statusAccessory(t: QueueTask): List.Item.Accessory {
    switch (t.status) {
      case "running":
        return { tag: { value: t.progress ?? "Running", color: Color.Blue } };
      case "success":
        return { tag: { value: "Done", color: Color.Green } };
      case "failed":
        return { tag: { value: "Failed", color: Color.Red } };
      case "skipped":
        return { tag: { value: "Skipped", color: Color.SecondaryText } };
      default:
        return { tag: { value: "Pending", color: Color.SecondaryText } };
    }
  }

  function statusIcon(s: TaskStatus): { source: Icon; tintColor: Color } {
    switch (s) {
      case "running":
        return { source: Icon.ArrowClockwise, tintColor: Color.Blue };
      case "success":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "failed":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "skipped":
        return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  const updatesTotal = tasks.length;
  const updatesDone = tasks.filter((t) => t.status === "success").length;
  const updatesFailed = tasks.filter((t) => t.status === "failed").length;
  // "Processed" = every task in a terminal state. Drives the on-screen bar so
  // it advances on both successes and failures, matching the toast.
  const updatesProcessed = tasks.filter(
    (t) =>
      t.status === "success" || t.status === "failed" || t.status === "skipped",
  ).length;

  const groupedTasks = {
    system: tasks.filter((t) => t.group === "system"),
    apps: tasks.filter((t) => t.group === "apps"),
    packages: tasks.filter((t) => t.group === "packages"),
  };

  return (
    <List
      isLoading={isScanning || running}
      navigationTitle={
        isScanning
          ? "Scanning…"
          : running
            ? `Updating ${updatesDone}/${updatesTotal}…`
            : done
              ? `${updatesDone} updated · ${updatesFailed} failed`
              : updatesTotal === 0
                ? "Nothing to update"
                : `Ready to update ${updatesTotal} thing${updatesTotal === 1 ? "" : "s"}`
      }
      searchBarPlaceholder="Filter the queue…"
    >
      {tasks.length === 0 && !isScanning && (
        <List.EmptyView
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          title={DONE_TITLE}
          description="Nothing needs updating right now."
          actions={
            <ActionPanel>
              <Action
                title="Rescan"
                icon={Icon.RotateClockwise}
                onAction={loadScan}
              />
            </ActionPanel>
          }
        />
      )}

      {(running || done) && updatesTotal > 0 && (
        <List.Section title="Progress">
          <List.Item
            icon={
              done
                ? updatesFailed > 0
                  ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                  : { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.ArrowClockwise, tintColor: Color.Blue }
            }
            title={progressBar(updatesProcessed, updatesTotal)}
            accessories={[
              ...(updatesFailed > 0
                ? [
                    {
                      tag: {
                        value: `${updatesFailed} failed`,
                        color: Color.Red,
                      },
                    },
                  ]
                : []),
              {
                tag: {
                  value: `${updatesProcessed}/${updatesTotal}`,
                  color: done && updatesFailed === 0 ? Color.Green : Color.Blue,
                },
              },
            ]}
          />
        </List.Section>
      )}

      {!running && !done && tasks.length > 0 && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.Rocket, tintColor: Color.Blue }}
            title={`Update ${updatesTotal} thing${updatesTotal === 1 ? "" : "s"} now`}
            subtitle={`${groupedTasks.apps.length} apps · ${groupedTasks.system.length + groupedTasks.packages.length} package managers`}
            accessories={[
              {
                tag: { value: "Start", color: Color.Blue },
                icon: Icon.ArrowRight,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Update Everything"
                  icon={Icon.Rocket}
                  onAction={runAll}
                />
                <Action
                  title="Rescan"
                  icon={Icon.RotateClockwise}
                  onAction={loadScan}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {groupedTasks.apps.length > 0 && (
        <List.Section title="Apps" subtitle={`${groupedTasks.apps.length}`}>
          {groupedTasks.apps.map((t) => renderTask(t))}
        </List.Section>
      )}

      {groupedTasks.system.length > 0 && (
        <List.Section
          title="Package Managers"
          subtitle={`${groupedTasks.system.length}`}
        >
          {groupedTasks.system.map((t) => renderTask(t))}
        </List.Section>
      )}

      {groupedTasks.packages.length > 0 && (
        <List.Section
          title="Library Packages"
          subtitle={`${groupedTasks.packages.length}`}
        >
          {groupedTasks.packages.map((t) => renderTask(t))}
        </List.Section>
      )}

      {done && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.RotateClockwise, tintColor: Color.Blue }}
            title="Rescan & Run Again"
            actions={
              <ActionPanel>
                <Action
                  title="Rescan & Run Again"
                  icon={Icon.RotateClockwise}
                  onAction={async () => {
                    await loadScan();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );

  function renderTask(t: QueueTask) {
    return (
      <List.Item
        key={t.id}
        icon={t.icon ? { fileIcon: t.icon } : statusIcon(t.status)}
        title={t.title}
        subtitle={t.error ? t.error.slice(0, 80) : t.subtitle}
        accessories={[
          statusAccessory(t),
          {
            icon: {
              source: SOURCE_ICON[t.source],
              tintColor: SOURCE_COLOR[t.source],
            },
            tooltip: t.source,
          },
        ]}
        actions={
          !running ? (
            <ActionPanel>
              <Action
                title={done ? "Run Again" : "Start Update"}
                icon={Icon.Rocket}
                onAction={runAll}
              />
              <Action
                title="Rescan"
                icon={Icon.RotateClockwise}
                onAction={loadScan}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }
}

// -------------------------------------------------------------------------------------------------

async function buildQueue(scan: ScanResult): Promise<QueueTask[]> {
  const tasks: QueueTask[] = [];

  // ── Apps via Homebrew: ONE TASK PER CASK.
  //
  // We used to roll every cask into a single `brew upgrade --greedy`. That had
  // three problems the per-cask split fixes:
  //   1. Greedy mode scans every installed tap. If ANY third-party tap is
  //      "untrusted" (kde-mac, etc.), brew exits non-zero — so an unrelated tap
  //      made the whole batch "fail" even though the casks it touched upgraded
  //      fine. That's the "failed but already updated" bug.
  //   2. One genuinely-failing cask dragged all the others down with it.
  //   3. The progress bar had a single task → 0% then 100%, no granularity.
  // Per-cask: isolated success/failure, real progress, and `upgradeCask` only
  // scans the one cask's tap. brew holds a global lock, so these run in the
  // serial "apps" group (which also runs after the parallel package-manager
  // batch, so they never collide with the formulae upgrade below).
  const brewApps = scan.apps.filter(
    (a) => a.hasUpdate && a.source === "homebrew-cask",
  );
  for (const a of brewApps) {
    const token = a.caskToken ?? a.app.name.toLowerCase();
    tasks.push({
      id: `cask:${token}`,
      group: "apps",
      source: "homebrew-cask",
      title: a.app.name,
      subtitle: `${shortenVersion(a.app.version)} → ${shortenVersion(a.latestVersion)}`,
      icon: a.app.appPath,
      status: "pending",
      run: async (onProgress) => {
        // upgradeCask quits the app if it's running and handles pkg-sudo via
        // SUDO_ASKPASS; the onProgress callback drives a live download bar.
        onProgress("Upgrading…");
        const r = await upgradeCask(token, a.app.name, onProgress);
        if (r.success) {
          recordHistory({
            name: a.app.name,
            bundleId: a.app.bundleId,
            source: "homebrew-cask",
            fromVersion: a.app.version,
            toVersion: a.latestVersion,
            trigger: "bulk",
          });
        }
        return r;
      },
    });
  }

  // ── App Store (mas) — auto-install mas if missing AND there are MAS updates
  const masApps = scan.apps.filter((a) => a.hasUpdate && a.source === "mas");
  if (masApps.length > 0) {
    tasks.push({
      id: "system:mas",
      group: "system",
      source: "mas",
      title: "Mac App Store",
      subtitle: `${masApps.length} app${masApps.length === 1 ? "" : "s"} via mas upgrade`,
      status: "pending",
      run: async (onProgress) => {
        if (!(await isMasInstalled())) {
          onProgress("Installing mas via Homebrew…");
          const inst = await installMas();
          if (!inst.success)
            return {
              name: "Mac App Store",
              source: "mas",
              success: false,
              error: inst.error,
            };
        }
        onProgress("Running mas upgrade…");
        return upgradeAllMas();
      },
    });
  }

  // ── Individual apps: Sparkle, Electron, GitHub
  for (const info of scan.apps) {
    if (!info.hasUpdate) continue;
    if (
      info.source === "homebrew-cask" ||
      info.source === "mas" ||
      info.source === "homebrew-formula"
    )
      continue;
    tasks.push(buildAppTask(info));
  }

  // ── CLI package managers
  if (
    (await commandExists("/opt/homebrew/bin/npm")) &&
    scan.cliPackages.some((p) => p.source === "npm")
  ) {
    const n = scan.cliPackages.filter((p) => p.source === "npm").length;
    tasks.push({
      id: "pkg:npm",
      group: "packages",
      source: "npm",
      title: "npm global packages",
      subtitle: `${n} outdated`,
      status: "pending",
      run: async () => upgradeAllNpm(),
    });
  }

  if (
    (await commandExists("/opt/homebrew/bin/pip3")) &&
    scan.cliPackages.some((p) => p.source === "pip")
  ) {
    const n = scan.cliPackages.filter((p) => p.source === "pip").length;
    tasks.push({
      id: "pkg:pip",
      group: "packages",
      source: "pip",
      title: "Python packages (pip)",
      subtitle: `${n} outdated`,
      status: "pending",
      run: async () => upgradeAllPip(),
    });
  }

  // Gem: only include if a user-writable Ruby exists
  if (isGemAvailable() && scan.cliPackages.some((p) => p.source === "gem")) {
    const n = scan.cliPackages.filter((p) => p.source === "gem").length;
    tasks.push({
      id: "pkg:gem",
      group: "packages",
      source: "gem",
      title: "Ruby gems",
      subtitle: `${n} outdated`,
      status: "pending",
      run: async () => upgradeAllGems(),
    });
  }

  // Homebrew formulae (CLI tools): ONE TASK PER FORMULA, mirroring casks.
  // Scoping each `brew upgrade <name>` to a single formula (a) gives the
  // progress bar real granularity and (b) avoids the bulk `brew upgrade
  // --formula` tap-trust scan that fails the whole run when any third-party tap
  // is untrusted. These join the serial brew lane in runAll.
  const outdatedFormulae = scan.cliPackages.filter(
    (p) => p.source === "homebrew-formula",
  );
  for (const f of outdatedFormulae) {
    tasks.push({
      id: `formula:${f.name}`,
      group: "packages",
      source: "homebrew-formula",
      title: f.name,
      subtitle: `${shortenVersion(f.currentVersion)} → ${shortenVersion(f.latestVersion)}`,
      status: "pending",
      run: async (onProgress) => {
        onProgress("Upgrading…");
        const r = await upgradeFormula(f.name);
        if (r.success) {
          recordHistory({
            name: f.name,
            source: "homebrew-formula",
            fromVersion: f.currentVersion,
            toVersion: f.latestVersion,
            trigger: "bulk",
          });
        }
        return r;
      },
    });
  }

  return tasks;
}

function buildAppTask(info: UpdateInfo): QueueTask {
  return {
    id: `app:${info.app.appPath}`,
    group: "apps",
    source: info.source,
    title: info.app.name,
    subtitle: `${shortenVersion(info.app.version)} → ${shortenVersion(info.latestVersion)}`,
    icon: info.app.appPath,
    status: "pending",
    run: async (onProgress): Promise<UpdateResult> => {
      if (!info.downloadUrl) {
        // No direct download URL — open the app to let its own updater finish
        await openAppForSparkleUpdate(info.app.appPath);
        recordHistory({
          name: info.app.name,
          bundleId: info.app.bundleId,
          source: info.source,
          fromVersion: info.app.version,
          toVersion: info.latestVersion,
          trigger: "bulk",
        });
        return { name: info.app.name, source: info.source, success: true };
      }
      onProgress("Starting…");
      const r = await downloadAndInstall({
        downloadUrl: info.downloadUrl,
        targetAppPath: info.app.appPath,
        appName: info.app.name,
        onProgress,
      });
      if (r.success) {
        recordHistory({
          name: info.app.name,
          bundleId: info.app.bundleId,
          source: info.source,
          fromVersion: info.app.version,
          toVersion: info.latestVersion,
          trigger: "bulk",
        });
      }
      return {
        name: info.app.name,
        source: info.source,
        success: r.success,
        error: r.error,
      };
    },
  };
}
