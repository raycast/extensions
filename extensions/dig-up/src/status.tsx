import { setupActionTitle } from "./lib/copy";
// Dig Up Status: DigUp's menu-bar item. The status line, what's being read, the counts, and Pause / Index Now. It runs
// every minute, which also keeps indexing going after a restart: GET /status starts the daemon when it isn't running
// (DigUp: StatusMenu.swift, AppModel.statusLine).

import {
  Icon,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { join } from "node:path";
import type { Status } from "../engine/api";
import { api } from "./lib/client";
import { daemonRunning, foldersChosen } from "./lib/daemon-files";
import { baseName, dirName } from "./lib/format";
import {
  hasFolders,
  kindCountsText,
  menuBarTitle,
  nothingChosen,
  searchable,
  secondsLeftText,
  statusDetail,
  statusLine,
} from "./lib/status-text";
import { LOGS, logTarget } from "./ui/log";
import { sendPreferencesIfChanged } from "./ui/prefs";
import { KIND_ICONS } from "./ui/result-parts";

type MenuState = { kind: "status"; status: Status } | { kind: "unset" } | { kind: "error"; message: string };

const ICON = { source: { light: "menubar-icon.png", dark: "menubar-icon@dark.png" } };
const PAUSED_ICON = { source: { light: "menubar-icon-paused.png", dark: "menubar-icon-paused@dark.png" } };

/**
 * The menu's state. The daemon owns the settings, but its settings file says whether any folder is chosen: with none
 * (or no file yet, a fresh install) and no daemon running, the menu bar doesn't start one just to report that there's
 * nothing to do. Otherwise GET /status starts the daemon if needed, so indexing resumes after a reboot without a login
 * item.
 */
async function load(): Promise<MenuState> {
  const support = environment.supportPath;
  const running = daemonRunning(support, join(environment.assetsPath, "daemon.js"));
  if (!running && foldersChosen(support) === "no") return { kind: "unset" };
  try {
    const status = await api("GET /status", undefined, { timeoutMs: 20_000 });
    // Preferences changed while no other command ran still reach the daemon.
    await sendPreferencesIfChanged().catch(() => undefined);
    return { kind: "status", status };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(load, [], { onError: () => undefined });
  // Raycast unloads a menu-bar command once it stops loading: an item's action keeps it loaded until it's done.
  const [working, setWorking] = useState(0);

  const run = (action: () => Promise<unknown>) => async () => {
    setWorking((n) => n + 1);
    try {
      await action();
      revalidate();
    } catch (error) {
      await showHUD(`Dig Up: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setWorking((n) => n - 1);
    }
  };
  const launch = (name: string) => run(() => launchCommand({ name, type: LaunchType.UserInitiated }));
  const openLog = run(() => open(logTarget()));

  const status = data?.kind === "status" ? data.status : null;
  const line =
    data?.kind === "status"
      ? statusLine(data.status)
      : data?.kind === "unset"
        ? "No folders chosen yet"
        : data?.kind === "error"
          ? "⚠︎ Dig Up's engine isn't running"
          : "Dig Up";
  const paused = status?.held === "paused";
  const chosen = status ? !nothingChosen(status) : false;
  const activity = status?.activity;
  const left = activity?.state === "indexing" ? secondsLeftText(activity.secondsLeft) : null;
  const detail =
    data?.kind === "status"
      ? statusDetail(data.status, (path) => baseName(path))
      : data?.kind === "unset"
        ? "Pick the folders it should search."
        : data?.kind === "error"
          ? data.message
          : null;

  const byKind: Record<string, number> = {};
  if (status) for (const [kind, counts] of Object.entries(status.main.byKind)) byKind[kind] = searchable(counts);
  const indexed = status ? searchable(status.main.total) : 0;
  const codeIndexed = status?.code ? searchable(status.code.total) : 0;

  return (
    <MenuBarExtra
      icon={paused ? PAUSED_ICON : ICON}
      title={status ? menuBarTitle(status) : undefined}
      tooltip={`Dig Up — ${line}`}
      isLoading={isLoading || working > 0}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={line} subtitle={left ?? undefined} />
        {detail ? <MenuBarExtra.Item title={detail} /> : null}
        {activity?.state === "indexing" && activity.current ? (
          <MenuBarExtra.Item
            title={`Reading ${baseName(activity.current.path)}`}
            icon={KIND_ICONS[activity.current.kind]}
            tooltip={activity.current.path}
            onAction={run(() => open(activity.current ? dirName(activity.current.path) : LOGS))}
          />
        ) : null}
        {status?.lastError ? (
          <MenuBarExtra.Item
            title={`⚠︎ ${status.lastError.message}`}
            tooltip={status.lastError.path ?? "Open the log"}
            onAction={openLog}
          />
        ) : null}
        {status && (indexed > 0 || codeIndexed > 0) ? (
          <MenuBarExtra.Submenu title="What's Indexed" icon={Icon.BarChart}>
            {Object.entries(byKind)
              .filter(([, n]) => n > 0)
              .map(([kind, n]) => (
                <MenuBarExtra.Item
                  key={kind}
                  title={kindCountsText({ [kind]: n })}
                  icon={KIND_ICONS[kind as keyof typeof KIND_ICONS]}
                />
              ))}
            {codeIndexed > 0 ? (
              <MenuBarExtra.Item title={kindCountsText({ code: codeIndexed })} icon={KIND_ICONS.code} />
            ) : null}
          </MenuBarExtra.Submenu>
        ) : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {!chosen ? (
          <MenuBarExtra.Item title="Choose Folders to Search…" icon={Icon.Folder} onAction={launch("folders")} />
        ) : null}
        <MenuBarExtra.Item title="Search…" icon={Icon.MagnifyingGlass} onAction={launch("search")} />
        <MenuBarExtra.Item
          title="Open Dig Up Pictures"
          icon={Icon.AppWindowGrid3x3}
          onAction={launch("search-pictures")}
        />
      </MenuBarExtra.Section>

      {status ? (
        <MenuBarExtra.Section>
          {hasFolders(status) || status.codeFolders.length > 0 ? (
            <MenuBarExtra.Item
              title={paused ? "Resume Indexing" : "Pause Indexing"}
              icon={paused ? Icon.Play : Icon.Pause}
              onAction={run(async () => {
                await api("POST /pause", { paused: !paused });
                await showHUD(paused ? "Indexing resumed" : "Indexing paused");
              })}
            />
          ) : null}
          <MenuBarExtra.Item
            title="Index Now"
            icon={Icon.ArrowClockwise}
            onAction={run(async () => {
              await api("POST /sync", {});
              await showHUD("Looking for new and changed files");
            })}
            alternate={
              <MenuBarExtra.Item
                title="Rebuild Index…"
                icon={Icon.RotateClockwise}
                onAction={launch("rebuild-index")}
              />
            }
          />
          {status.setup.state === "missing" || status.setup.state === "failed" ? (
            <MenuBarExtra.Item
              title={setupActionTitle(status.setup)}
              icon={Icon.Download}
              onAction={run(async () => {
                await api("POST /setup", {});
                await showHUD("Downloading the model");
              })}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Folders…" icon={Icon.Folder} onAction={launch("folders")} />
        <MenuBarExtra.Item title="Extension Preferences…" icon={Icon.Gear} onAction={run(openExtensionPreferences)} />
        <MenuBarExtra.Item title="Open Log" icon={Icon.Terminal} onAction={openLog} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
