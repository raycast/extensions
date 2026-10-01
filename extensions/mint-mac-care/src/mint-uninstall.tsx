import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useRef, useState } from "react";
import { useStrike } from "./use-strike";
import { formatCompact, openMint, plural, runMintSurface } from "./mint-cli";

import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";
import {
  Remnant,
  UninstallScan as UninstallScanResponse,
  appPicture,
  finishedRows,
  orderedRemnants,
  uninstallPlan,
} from "./mint-panes";

type InstalledApp = {
  id: string;
  name: string;
  path: string;
  bundleIdentifier: string;
};

type AppsResponse = { items: InstalledApp[] };

type UninstallResponse = {
  deletedCount: number;
  failedCount: number;
  freedBytes: number;
  quotaBlockedCount: number;
  safetyBlockedCount: number;
  removedAppBundle: boolean;
  adminAuthorizationRequired?: boolean;
  adminAuthorizationWasCancelled?: boolean;
  failures?: Array<{ path: string; reason: string }>;
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <InstalledApps cli={resolution.path} />;
}

type Looked = { scan?: UninstallScanResponse; error?: string };
type Running = { pid: number; path: string };

const execFileAsync = promisify(execFile);

/**
 * Installed apps on the left; the selected one's bundle and everything it
 * left behind on the right, looked up when it is selected. ↵ uninstalls,
 * whether or not the look has finished (it waits for it), after one
 * question; the files are struck one by one as they go to the Trash. Paths
 * on the Ignore list stay out unless chosen with ⌘O.
 */
function InstalledApps({ cli }: { cli: string }) {
  const { data, error, isLoading, revalidate } = usePromise(
    async (path: string) => runMintSurface<AppsResponse>(path, { action: "apps.list" }, 30_000),
    [cli],
  );
  const [selected, setSelected] = useState<string | undefined>();
  const [looked, setLooked] = useState<Record<string, Looked>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  // The app went to the Trash but some leftovers stayed. Mint looks at an
  // app through its bundle, so it cannot look at this one again: what stayed
  // is kept on screen with Mint's reason, to open in Finder.
  const [stayed, setStayed] = useState<Record<string, { scan: UninstallScanResponse; reason?: string }>>({});
  const [run, setRun] = useState<{ appID: string; ids: string[]; verb: string } | undefined>();
  const pending = useRef<Partial<Record<string, Promise<UninstallScanResponse>>>>({});
  const strike = useStrike();
  const { push, pop } = useNavigation();
  const appearance = environment.appearance === "light" ? "light" : "dark";

  const look = (app: InstalledApp): Promise<UninstallScanResponse> => {
    const started = (pending.current[app.id] ??= runMintSurface<UninstallScanResponse>(
      cli,
      { action: "uninstall.scan", path: app.path },
      5 * 60_000,
    ).then(
      (scan) => {
        setLooked((current) => ({ ...current, [app.id]: { scan } }));
        return scan;
      },
      (scanError: unknown) => {
        delete pending.current[app.id];
        const message = scanError instanceof Error ? scanError.message : String(scanError);
        setLooked((current) => ({ ...current, [app.id]: { error: message } }));
        throw scanError;
      },
    ));
    return started;
  };

  useEffect(() => {
    const app = data?.items.find((item) => item.id === selected);
    if (!app || looked[app.id] || app.id in pending.current) return;
    const timer = setTimeout(() => look(app).catch(() => undefined), 250);
    return () => clearTimeout(timer);
  }, [selected, data, looked]);

  const forget = (id: string) => {
    delete pending.current[id];
    setLooked((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  async function uninstall(app: InstalledApp, chosen?: Remnant[]) {
    if (run || strike.active) return;
    let scan = looked[app.id]?.scan;
    if (!scan) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Looking at what ${app.name} left…` });
      try {
        scan = await look(app);
        await toast.hide();
      } catch (scanError) {
        toast.style = Toast.Style.Failure;
        toast.title = `Mint could not look at ${app.name}`;
        toast.message = scanError instanceof Error ? scanError.message : String(scanError);
        return;
      }
    }
    const items = chosen ?? uninstallPlan(scan).items;
    if (items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Nothing of ${app.name} can go`,
        message: "Everything Mint found is on your Ignore list. Choose with ⌘O.",
      });
      return;
    }
    const bytes = items.reduce((sum, item) => sum + Math.max(0, item.sizeBytes), 0);
    const includesApp = items.some((item) => item.category === "app-bundle");
    const running = await runningInside(app.path);
    const accepted = await confirmAlert({
      icon: { fileIcon: app.path },
      title: includesApp ? `Uninstall ${app.name}?` : `Remove ${app.name}'s leftovers?`,
      message: [
        `${formatCompact(bytes)} moves to the Trash, where you can put it back.`,
        running.length ? `${app.name} is running. Mint asks it to quit first.` : undefined,
        items.some((item) => item.requiresAdmin) ? "macOS may ask for your Mac password." : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
      primaryAction: {
        title: running.length ? "Quit and Uninstall" : "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!accepted) return;

    const ids = items.map((item) => item.id);
    if (running.length) {
      setRun({ appID: app.id, ids, verb: `Quitting ${app.name}` });
      const still = await quit(app, running);
      if (still.length) {
        setRun(undefined);
        await showToast({
          style: Toast.Style.Failure,
          title: `${app.name} is still running`,
          message: "Quit it (and save what is open), then uninstall again. Nothing was moved.",
        });
        return;
      }
    }
    setRun({ appID: app.id, ids, verb: "Moving to the Trash" });
    strike.begin(ids.length);
    try {
      const result = await runMintSurface<UninstallResponse>(cli, {
        action: "uninstall.execute",
        sessionID: scan.sessionID,
        itemIDs: ids,
        allowAdmin: true,
        confirmed: true,
      });
      // Rows Mint held back for the free allowance are not named, so nothing
      // is struck then; a cancelled password keeps the rows that needed it.
      const finished = new Set(
        result.quotaBlockedCount ? [] : finishedRows(items, result.failedCount ?? 0, result.failures),
      );
      const done = items
        .filter((item) => finished.has(item.id) && !(result.adminAuthorizationWasCancelled && item.requiresAdmin))
        .map((item) => item.id);
      const problems = [
        result.quotaBlockedCount ? `${result.quotaBlockedCount} held back: the free 1 GB is used up` : undefined,
        result.adminAuthorizationWasCancelled ? "the password was cancelled" : undefined,
        result.failedCount
          ? `${result.failedCount} kept: ${result.failures?.[0]?.reason ?? "macOS refused"}`
          : undefined,
      ].filter(Boolean);
      const kept = scan.items.filter((item) => item.category !== "app-bundle" && !done.includes(item.id));
      strike.end(done, async () => {
        setRun(undefined);
        if (result.removedAppBundle && kept.length === 0) {
          setRemoved((current) => new Set(current).add(app.id));
        } else if (result.removedAppBundle) {
          setStayed((current) => ({
            ...current,
            [app.id]: { scan: { ...scan, items: kept }, reason: result.failures?.[0]?.reason },
          }));
        }
        // An app still installed is looked at again at once (the lookup
        // runs when its scan is forgotten).
        forget(app.id);
        await showToast({
          style: problems.length && !result.deletedCount ? Toast.Style.Failure : Toast.Style.Success,
          title: result.removedAppBundle
            ? `${app.name} moved to the Trash · ${formatCompact(result.freedBytes)}`
            : result.deletedCount
              ? `${plural(result.deletedCount, "item")} moved to the Trash`
              : `${app.name} was not removed`,
          message: problems.length ? problems.join(" · ") : undefined,
        });
      });
    } catch (executeError) {
      strike.end([], () => setRun(undefined));
      await showToast({
        style: Toast.Style.Failure,
        title: `Mint could not uninstall ${app.name}`,
        message: executeError instanceof Error ? executeError.message : String(executeError),
      });
    }
  }

  const busy = Boolean(run) || strike.active;
  const apps = data?.items.filter((app) => !removed.has(app.id)) ?? [];

  return (
    <List
      isLoading={isLoading || busy}
      isShowingDetail={apps.length > 0}
      navigationTitle="Uninstall App"
      searchBarPlaceholder="Search installed apps"
      onSelectionChange={(id) => setSelected(id ?? undefined)}
    >
      {error ? (
        <List.EmptyView title="Mint could not list your apps" description={error.message} icon={Icon.Warning} />
      ) : null}
      {apps.map((app) => {
        const left = stayed[app.id];
        if (left) {
          const bytes = left.scan.items.reduce((sum, item) => sum + Math.max(0, item.sizeBytes), 0);
          return (
            <List.Item
              key={app.id}
              id={app.id}
              icon={Icon.Trash}
              title={app.name}
              accessories={[{ text: `${plural(left.scan.items.length, "leftover")} stayed` }]}
              detail={
                <List.Item.Detail
                  markdown={appPicture(left.scan, appearance, {
                    receipt: { bytes, text: left.reason ? `stayed · ${left.reason}` : "stayed after the app went" },
                  })}
                />
              }
              actions={
                <ActionPanel>
                  {left.scan.items[0] ? <Action.ShowInFinder path={left.scan.items[0].path} /> : null}
                  <Action title="Open Mint" icon={Icon.AppWindow} onAction={() => openMint()} />
                </ActionPanel>
              }
            />
          );
        }
        const result = looked[app.id];
        const scan = result?.scan;
        const plan = scan ? uninstallPlan(scan) : undefined;
        const here = run?.appID === app.id ? run : undefined;
        return (
          <List.Item
            key={app.id}
            id={app.id}
            icon={{ fileIcon: app.path }}
            title={app.name}
            accessories={here ? [{ text: here.verb }] : plan ? [{ text: formatCompact(plan.bytes) }] : []}
            detail={
              <List.Item.Detail
                isLoading={!result}
                markdown={
                  result?.error
                    ? `Mint could not look at ${app.name}.\n\n${result.error}`
                    : scan
                      ? appPicture(scan, appearance, {
                          struck: strike.struck,
                          gone: strike.gone,
                          running: here
                            ? `${here.verb} · ${here.ids.filter((id) => strike.struck.has(id)).length} of ${here.ids.length}`
                            : undefined,
                        })
                      : ""
                }
              />
            }
            actions={
              <ActionPanel>
                {!busy ? (
                  <Action
                    title={`Uninstall ${app.name}`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => uninstall(app)}
                  />
                ) : null}
                {scan && !busy ? (
                  <Action
                    title="Choose What to Remove"
                    icon={Icon.List}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={() =>
                      push(
                        <UninstallReview
                          app={app}
                          scan={scan}
                          onRemove={(items) => {
                            pop();
                            return uninstall(app, items);
                          }}
                        />,
                      )
                    }
                  />
                ) : null}
                <Action.ShowInFinder path={app.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                <ActionPanel.Section>
                  <Action
                    title="Look Again"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => {
                      forget(app.id);
                      revalidate();
                    }}
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

/** Whether `pid` still runs a program from inside the bundle. */
async function stillInside(pid: number, bundlePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-p", String(pid), "-o", "comm="]);
    return stdout.trim().startsWith(`${bundlePath}/`);
  } catch {
    return false;
  }
}

/**
 * Every process running from inside the app's bundle, the app and its
 * helpers, from `ps`: asking never starts anything.
 */
async function runningInside(bundlePath: string): Promise<Running[]> {
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,comm="], { maxBuffer: 8 * 1024 * 1024 });
    const prefix = `${bundlePath}/`;
    return stdout
      .split("\n")
      .map((line) => line.trim().match(/^(\d+)\s+(.+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => ({ pid: Number(match[1]), path: match[2] }))
      .filter((process) => process.path.startsWith(prefix));
  } catch {
    return [];
  }
}

/**
 * Asks the app to quit the way the Dock does (it may ask to save), waits,
 * then ends any helper left running inside its bundle. Answers what is still
 * running; the uninstall waits for nothing to be.
 */
async function quit(app: InstalledApp, running: Running[]): Promise<Running[]> {
  const wait = async (milliseconds: number) => {
    for (let waited = 0; waited < milliseconds; waited += 250) {
      if ((await runningInside(app.path)).length === 0) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };
  const main = `${app.path}/Contents/MacOS/`;
  if (running.some((process) => process.path.startsWith(main)) && app.bundleIdentifier) {
    // It is running, so this addresses it and never launches it.
    await execFileAsync(
      "/usr/bin/osascript",
      ["-e", `tell application id "${app.bundleIdentifier.replace(/"/g, "")}" to quit`],
      { timeout: 10_000 },
    ).catch(() => undefined);
    await wait(10_000);
  }
  // The app said no (a document to save, a cancel): its helpers are its
  // windows' own processes, so they are left alone too.
  const left = await runningInside(app.path);
  if (left.some((process) => process.path.startsWith(main))) return left;
  for (const helper of left) {
    // Asked again right before the signal: a helper that exited in between
    // may have left its PID to some other program.
    if (!(await stillInside(helper.pid, app.path))) continue;
    try {
      process.kill(helper.pid, "SIGTERM");
    } catch {
      // Already gone, or not ours.
    }
  }
  await wait(3_000);
  return runningInside(app.path);
}

function UninstallReview({
  app,
  scan,
  onRemove,
}: {
  app: InstalledApp;
  scan: UninstallScanResponse;
  onRemove: (items: Remnant[]) => Promise<void>;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set(uninstallPlan(scan).items.map((item) => item.id)));
  const picked = scan.items.filter((item) => chosen.has(item.id) && item.selectable);
  const pickedBytes = picked.reduce((sum, item) => sum + item.sizeBytes, 0);
  const toggle = (item: Remnant) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  const ordered = orderedRemnants(scan);
  return (
    <List
      navigationTitle={picked.length ? `${formatCompact(pickedBytes)} chosen` : app.name}
      searchBarPlaceholder={`Search ${app.name}'s files`}
    >
      {ordered.map((item) => {
        const isChosen = chosen.has(item.id);
        return (
          <List.Item
            key={item.id}
            icon={item.category === "app-bundle" ? { fileIcon: app.path } : { fileIcon: item.path }}
            title={item.category === "app-bundle" ? app.name : item.label}
            subtitle={item.categoryTitle}
            accessories={[
              { text: formatCompact(item.sizeBytes) },
              item.selectable
                ? {
                    icon: {
                      source: isChosen ? Icon.CheckCircle : Icon.Circle,
                      tintColor: isChosen ? Color.PrimaryText : Color.SecondaryText,
                    },
                  }
                : { icon: Icon.Lock, tooltip: "On your Ignore list" },
            ]}
            actions={
              <ActionPanel>
                {item.selectable ? (
                  <Action
                    title={isChosen ? "Unchoose" : "Choose"}
                    icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggle(item)}
                  />
                ) : null}
                {picked.length ? (
                  <Action
                    title="Move Chosen to Trash"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => onRemove(picked)}
                  />
                ) : null}
                <Action.ShowInFinder path={item.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
