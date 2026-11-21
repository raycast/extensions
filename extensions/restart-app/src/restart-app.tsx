import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import { bundleKey, countInstances, selectRestartableApps } from "./lib/filter.ts";
import { createMacosDeps, listRunningApps } from "./lib/macos.ts";
import { RestartCoordinator, describeResult } from "./lib/restart.ts";
import type { RestartStage } from "./lib/restart.ts";
import type { RestartMode, RestartableApp } from "./lib/types.ts";

// Module scope so the per-bundle guard survives re-renders.
const coordinator = new RestartCoordinator(createMacosDeps());

const FORCE_RESTART_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "r" };

async function loadRestartableApps(): Promise<RestartableApp[]> {
  return selectRestartableApps(await listRunningApps());
}

function progressTitle(app: RestartableApp, mode: RestartMode, stage: RestartStage): string {
  switch (stage) {
    case "quitting":
      return mode === "force" ? `Force quitting ${app.name}…` : `Quitting ${app.name}…`;
    case "waiting":
      return `Waiting for ${app.name} to quit…`;
    case "reopening":
      return `Reopening ${app.name}…`;
  }
}

function confirmForceRestart(app: RestartableApp): Promise<boolean> {
  return confirmAlert({
    title: `Force Restart ${app.name}?`,
    message: `${app.name} will be terminated immediately without a chance to save. Any unsaved changes will be lost.`,
    icon: { fileIcon: app.bundlePath },
    primaryAction: { title: "Force Restart", style: Alert.ActionStyle.Destructive },
    dismissAction: { title: "Cancel" },
  });
}

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(loadRestartableApps, [], {
    failureToastOptions: { title: "Couldn't Load Running Apps" },
  });
  const apps = data ?? [];
  const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(new Set());

  const setBusy = useCallback((app: RestartableApp, busy: boolean) => {
    setBusyKeys((previous) => {
      const next = new Set(previous);
      if (busy) next.add(bundleKey(app));
      else next.delete(bundleKey(app));
      return next;
    });
  }, []);

  const restart = useCallback(
    async (app: RestartableApp, mode: RestartMode, quitOnly = false) => {
      let toast: Promise<Toast> | undefined;
      const onProgress = (stage: RestartStage) => {
        const title = progressTitle(app, mode, stage);
        if (!toast) {
          setBusy(app, true);
          toast = showToast({ style: Toast.Style.Animated, title });
        } else {
          void toast.then((shown) => {
            shown.title = title;
          });
        }
      };

      const result = await coordinator.restart(app, {
        mode,
        quitOnly,
        confirm: mode === "force" ? () => confirmForceRestart(app) : undefined,
        onProgress,
      });
      if (toast) setBusy(app, false);

      if (!result.ok && result.reason === "cancelled") return;
      const text = describeResult(app, mode, result, quitOnly);
      const shown = await (toast ?? showToast({ style: Toast.Style.Failure, title: text.title }));
      shown.style = result.ok ? Toast.Style.Success : Toast.Style.Failure;
      shown.title = text.title;
      shown.message = text.message;
      if (
        !quitOnly &&
        !result.ok &&
        (result.reason === "quitTimeout" || result.reason === "quitRefused") &&
        mode === "graceful"
      ) {
        shown.primaryAction = {
          title: "Force Restart",
          onAction: (current) => {
            void current.hide();
            void restart(app, "force");
          },
        };
      }
      if (result.ok || result.reason !== "busy") revalidate();
    },
    [revalidate, setBusy],
  );

  const instanceCounts = countInstances(apps);
  const nameCounts = new Map<string, number>();
  const pathCounts = new Map<string, number>();
  for (const app of apps) {
    const name = app.name.toLowerCase();
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    pathCounts.set(app.bundlePath, (pathCounts.get(app.bundlePath) ?? 0) + 1);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running apps by name or bundle ID">
      {error && apps.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't Load Running Apps"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title={isLoading ? "Loading Running Apps…" : "No Restartable Apps"}
          description={
            isLoading ? undefined : "No regular or menu bar apps match. Raycast, Finder, and system helpers are hidden."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {apps.map((app) => {
        const busy = busyKeys.has(bundleKey(app));
        const sharedName = (nameCounts.get(app.name.toLowerCase()) ?? 0) > 1;
        const duplicated = (instanceCounts.get(bundleKey(app)) ?? 0) > 1;
        const id = (pathCounts.get(app.bundlePath) ?? 0) > 1 ? `${app.bundlePath}:${app.pid}` : app.bundlePath;
        const accessories: List.Item.Accessory[] = [];
        if (busy) accessories.push({ tag: { value: "Working…", color: Color.Orange }, icon: Icon.Hourglass });
        if (app.kind === "accessory")
          accessories.push({ tag: "Menu Bar", tooltip: "Accessory app without a Dock icon" });
        if (duplicated) accessories.push({ text: `PID ${app.pid}`, tooltip: "Multiple instances are running" });

        return (
          <List.Item
            key={id}
            id={id}
            icon={{ fileIcon: app.bundlePath }}
            title={app.name}
            subtitle={sharedName ? app.bundlePath : undefined}
            keywords={[app.bundleId, app.bundlePath.slice(app.bundlePath.lastIndexOf("/") + 1)]}
            accessories={accessories}
            actions={
              <ActionPanel title={app.name}>
                <ActionPanel.Section>
                  <Action title="Restart" icon={Icon.ArrowClockwise} onAction={() => restart(app, "graceful")} />
                  <Action
                    title="Force Restart"
                    icon={Icon.ExclamationMark}
                    style={Action.Style.Destructive}
                    shortcut={FORCE_RESTART_SHORTCUT}
                    onAction={() => restart(app, "force")}
                  />
                  <Action title="Quit" icon={Icon.XMarkCircle} onAction={() => restart(app, "graceful", true)} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh List"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
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
