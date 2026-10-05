import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  getSelectedFinderItems,
  Icon,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { promises as fs } from "node:fs";
import path from "node:path";
import { useCallback, useEffect, useState } from "react";
import { AddItemsForm } from "./add-items-form";
import { savePanelState, syncServiceConfig } from "./lib/config";
import { addShareEntry } from "./lib/list";
import { qrImageUrl, writeQrCode } from "./lib/qr";
import {
  checkDataPlane,
  conflictMessage,
  probe,
  restartService,
  startService,
  stopService,
} from "./lib/service";
import { loadSnapshot, type Snapshot } from "./lib/snapshot";
import { strings } from "./lib/strings";
import type { ActionResult, ProbeResult, ServiceStatus } from "./lib/types";

/**
 * The panel stays minimal: one row with the session state, and the address above the QR code next to it. The
 * network interface sits in the search bar, and the share list itself is managed on the page.
 */
export default function Command() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await loadSnapshot();
      if (next.probe.state === "running") {
        // The service serves this file at /qr.png, so the panel needs no local-file image support.
        await writeQrCode(next.probe.status.address).catch(() => undefined);
      }
      setSnapshot(next);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: strings.statusUnknown,
        message: messageOf(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (
      title: string,
      action: () => Promise<ActionResult>,
      verifyDataPlane = false,
    ) => {
      setIsBusy(true);
      try {
        const result = await action();
        if (!result.ok) {
          await showToast({
            style: Toast.Style.Failure,
            title,
            message: result.message,
          });
          return;
        }
        if (verifyDataPlane) {
          const current = await probe();
          if (
            current.state === "running" &&
            !(await checkDataPlane(current.status))
          ) {
            await showToast({
              style: Toast.Style.Failure,
              title: strings.unreachableAfterStart,
              message: current.status.address,
            });
            return;
          }
        }
        await showToast({
          style: Toast.Style.Success,
          title,
          message: result.message,
        });
      } finally {
        setIsBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  const startSharing = useCallback(async () => {
    if (!snapshot) return;
    if (snapshot.interfaces.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: strings.statusNoInterface,
        message: strings.noInterfaceDetail,
      });
      return;
    }
    await run(strings.start, () => startService(snapshot.config), true);
  }, [run, snapshot]);

  const stopSharing = useCallback(
    async () => run(strings.stop, () => stopService()),
    [run],
  );

  const restartSharing = useCallback(
    async () =>
      snapshot
        ? run(strings.restart, () => restartService(snapshot.config), true)
        : undefined,
    [run, snapshot],
  );

  const useInterface = useCallback(
    async (host: string) => {
      if (!snapshot || host === snapshot.selectedHost) return;
      const item = snapshot.interfaces.find((entry) => entry.address === host);
      await savePanelState({ host });

      if (snapshot.probe.state !== "running") {
        await showToast({
          style: Toast.Style.Success,
          title: strings.interfaceWillApplyOnStart(host),
        });
        await refresh();
        return;
      }

      const confirmed = await confirmAlert({
        title: strings.switchInterfaceTitle(item?.name ?? host, host),
        message: strings.switchInterfaceMessage,
        primaryAction: { title: strings.restart },
        dismissAction: { title: strings.later },
      });
      if (!confirmed) {
        await showToast({
          style: Toast.Style.Success,
          title: strings.interfaceWillApplyOnStart(host),
        });
        await refresh();
        return;
      }
      const config = await syncServiceConfig({
        preferences: snapshot.preferences,
        host,
      });
      await run(strings.restart, () => restartService(config), true);
    },
    [refresh, run, snapshot],
  );

  /** Adds paths to the list. They are referenced in place: nothing is copied to the receive directory. */
  const addPaths = useCallback(
    async (paths: string[]) => {
      try {
        for (const target of paths) {
          const stat = await fs.stat(target);
          await addShareEntry({
            type: stat.isDirectory() ? "directory" : "file",
            name: path.basename(target),
            path: target,
          });
        }
        await showToast({
          style: Toast.Style.Success,
          title: strings.added(paths.length),
          message: strings.referencedInPlace,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: strings.addFailed,
          message: messageOf(error),
        });
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  /** Same thing for whatever is already selected in Finder, so there is no extra picker step. */
  const shareFinderSelection = useCallback(async () => {
    try {
      const selected = await getSelectedFinderItems();
      if (selected.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: strings.nothingSelected,
          message: strings.nothingSelectedHint,
        });
        return;
      }
      await addPaths(selected.map((item) => item.path));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: strings.addFailed,
        message: messageOf(error),
      });
    }
  }, [addPaths]);

  const openReceiveDirectory = useCallback(async () => {
    if (!snapshot) return;
    const directory = snapshot.preferences.receiveDirectory;
    try {
      await fs.mkdir(directory, { recursive: true });
      await open(directory);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: strings.openReceiveDirectory,
        message: messageOf(error),
      });
    }
  }, [snapshot]);

  const probeResult: ProbeResult = snapshot?.probe ?? {
    state: "unknown",
    message: "Loading",
  };
  const status: ServiceStatus | undefined =
    probeResult.state === "running" ? probeResult.status : undefined;
  const predictedAddress =
    snapshot && snapshot.selectedHost
      ? `http://${snapshot.selectedHost}:${snapshot.config.port}/`
      : "";
  const address = status?.address ?? predictedAddress;
  const conflict = probeResult.state === "conflict" ? probeResult : undefined;

  return (
    <List
      isLoading={isLoading || isBusy}
      isShowingDetail
      navigationTitle={strings.fileShare}
      searchBarPlaceholder={strings.fileShare}
      searchBarAccessory={
        snapshot && snapshot.interfaces.length > 0 ? (
          <List.Dropdown
            tooltip={strings.interfaceDropdown}
            value={snapshot.selectedHost}
            onChange={(host) => void useInterface(host)}
          >
            {snapshot.interfaces.map((item) => (
              <List.Dropdown.Item
                key={item.address}
                title={`${item.name} · ${item.address}`}
                value={item.address}
                icon={Icon.Wifi}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      <List.Item
        id="session"
        title={headline(probeResult)}
        icon={statusIcon(probeResult)}
        detail={
          <List.Item.Detail markdown={detailMarkdown(snapshot, probeResult)} />
        }
        actions={
          <ActionPanel>
            {status ? (
              <Action
                title={strings.stop}
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={() => void stopSharing()}
              />
            ) : (
              <Action
                title={strings.start}
                icon={Icon.Play}
                onAction={() => void startSharing()}
              />
            )}
            <Action.Push
              title={strings.addItems}
              icon={Icon.Plus}
              target={<AddItemsForm onAdd={addPaths} />}
            />
            {address !== "" ? (
              <Action.CopyToClipboard
                title={strings.copyAddress}
                content={address}
              />
            ) : null}
            {address !== "" ? (
              <Action.OpenInBrowser
                title={strings.openInBrowser}
                url={address}
              />
            ) : null}
            {status ? (
              <Action
                title={strings.restart}
                icon={Icon.RotateClockwise}
                onAction={() => void restartSharing()}
              />
            ) : null}
            <Action
              title={strings.shareSelection}
              icon={Icon.Finder}
              onAction={() => void shareFinderSelection()}
            />
            {conflict ? (
              <Action
                title={strings.changePort}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            ) : null}
            <Action
              title={strings.openReceiveDirectory}
              icon={Icon.Download}
              onAction={() => void openReceiveDirectory()}
            />
            <Action
              title={strings.refresh}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => void refresh()}
            />
            <Action
              title={strings.openPreferences}
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function headline(probeResult: ProbeResult): string {
  if (probeResult.state === "running") return strings.statusRunning;
  if (probeResult.state === "conflict") return strings.statusConflict;
  if (probeResult.state === "unknown") return strings.statusUnknown;
  return strings.statusStopped;
}

function statusIcon(probeResult: ProbeResult): {
  source: Icon;
  tintColor: Color;
} {
  if (probeResult.state === "running")
    return { source: Icon.Play, tintColor: Color.Green };
  if (probeResult.state === "conflict" || probeResult.state === "unknown") {
    return { source: Icon.ExclamationMark, tintColor: Color.Orange };
  }
  return { source: Icon.Power, tintColor: Color.SecondaryText };
}

/**
 * The address and the code each carry a label, and the address stays plain text so it has no background.
 *
 * The QR code is written as HTML instead of `![alt](src)` on purpose: Raycast renders a markdown image as a
 * centered block, and wraps the image element in its own component. An image nested inside a plain `div` is
 * left alone by that styling, which keeps the code anchored under its label instead of floating in the middle
 * of the pane. `raycast-width` is how the markdown renderer is told how wide the image should be.
 */
function detailMarkdown(
  snapshot: Snapshot | undefined,
  probeResult: ProbeResult,
): string {
  if (!snapshot) return "";

  const status =
    probeResult.state === "running" ? probeResult.status : undefined;
  if (!status) {
    const lines = [strings.startHint];
    if (probeResult.state === "conflict")
      lines.unshift(conflictMessage(probeResult.port, probeResult.owner));
    else if (probeResult.state === "unknown")
      lines.unshift(probeResult.message);
    else if (snapshot.interfaces.length === 0)
      lines.unshift(strings.noInterfaceDetail);
    return lines.join("\n\n");
  }

  const lines = [
    `**${strings.shareLink}**`,
    "",
    status.address,
    "",
    `**${strings.qrCode}**`,
    "",
    `<div><img src="${qrImageUrl(status.address)}?raycast-width=220" alt="QR code for ${status.address}" /></div>`,
  ];
  if (snapshot.preferences.portProblem)
    lines.push("", `> ${snapshot.preferences.portProblem}`);
  else if (
    status.port !== snapshot.config.port ||
    status.host !== snapshot.selectedHost
  ) {
    lines.push("", `> ${strings.restartNeededDetail}`);
  }
  return lines.join("\n");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
