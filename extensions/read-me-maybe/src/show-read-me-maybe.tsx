import { launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { clearTimeout, setTimeout } from "node:timers";
import { useEffect, useRef, useState } from "react";

import { scanDock } from "./dock-scan";
import { runOpenCommand } from "./open-source";
import {
  accessCheckPrompt,
  permissionFailureOf,
  recordBackgroundAccessResult,
  recordExplicitAccessCheck,
  type AccessCheckPrompt,
  type AccessCheckState,
  type PermissionFailure,
} from "./domain/access-check-state";
import { messageIcon, sourceRowIcon } from "./domain/view-unreads";
import { DockScanCoordinator } from "./domain/dock-scan-coordinator";
import type { StoredSource } from "./domain/source-catalog";
import {
  enabledSources,
  menuPresentation,
  summarizeDockScan,
  type DockScan,
  type UnreadCountResult,
} from "./domain/unread-count";
import { migrateLegacySetupGate, saveAccessCheckState } from "./setup-gate";
import { loadSourceCatalog } from "./source-catalog-store";
import { saveUnreadSnapshot } from "./unread-snapshot-store";

type MenuState =
  | { kind: "loading" }
  | { kind: "checking" }
  | {
      kind: "accessCheckRequired";
      prompt: AccessCheckPrompt;
      manualAccessibilityPathShown: boolean;
      accessCheckResult?: UnreadCountResult;
    }
  | { kind: "result"; value: UnreadCountResult; updatedAt?: Date };

const dockScans = new DockScanCoordinator((sources, timeout) => scanDock(sources, timeout));

const unreadActivityIcon = { source: { light: "message-activity-light.png", dark: "message-activity-dark.png" } };

export default function UnreadCountCommand() {
  const [state, setState] = useState<MenuState>({ kind: "loading" });
  const accessCheckInProgress = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const sources = await currentSources();
      const accessState = await migrateLegacySetupGate();
      if (sources.length === 0) {
        if (!cancelled) setScheduledAccessRequired(accessState, sources.length);
        return;
      }

      if (!accessState.setupGate) {
        if (!cancelled) setScheduledAccessRequired(accessState, sources.length);
        return;
      }

      const scan = await dockScans.background(sources);
      if (accessCheckInProgress.current) return;

      const result = summarizeDockScan(sources, scan);
      await saveUnreadSnapshot({ result, readAt: new Date() }).catch(() => undefined);
      const currentAccessState = await migrateLegacySetupGate();
      const nextAccessState = recordBackgroundAccessResult(currentAccessState, toSetupDiagnostic(scan));
      if (nextAccessState !== currentAccessState) await saveAccessCheckState(nextAccessState);
      if (!cancelled) {
        const livePermissionFailure = permissionFailureOf(scan);
        if (nextAccessState.setupGate) {
          setState({ kind: "result", value: result, updatedAt: new Date() });
        } else {
          setScheduledAccessRequired(nextAccessState, sources.length, undefined, livePermissionFailure);
        }
      }
    }

    let nextRefresh: ReturnType<typeof setTimeout> | undefined;
    async function refreshOnSchedule() {
      try {
        await refresh();
      } catch {
        if (!cancelled) setState({ kind: "result", value: { sources: [], aggregate: { kind: "failed" } } });
      }
      if (!cancelled) nextRefresh = setTimeout(() => void refreshOnSchedule(), 15_000);
    }

    void refreshOnSchedule();
    return () => {
      cancelled = true;
      if (nextRefresh) clearTimeout(nextRefresh);
    };
  }, []);

  function setScheduledAccessRequired(
    accessState: AccessCheckState,
    sourceCount: number,
    accessCheckResult?: UnreadCountResult,
    livePermissionFailure?: PermissionFailure,
  ) {
    setState((current) => {
      if (accessCheckInProgress.current) return current;
      const next = accessRequiredState(accessState, sourceCount, accessCheckResult, livePermissionFailure);
      return current.kind === "accessCheckRequired"
        ? { ...next, manualAccessibilityPathShown: current.manualAccessibilityPathShown }
        : next;
    });
  }

  async function checkAccess() {
    accessCheckInProgress.current = true;
    const sources = await currentSources();
    try {
      if (sources.length === 0) {
        const accessState = await migrateLegacySetupGate();
        setState(accessRequiredState(accessState, sources.length));
        return;
      }

      setState({ kind: "checking" });
      // A first-time Automation prompt can keep the script open while the user responds.
      const scan = await dockScans.accessCheck(sources);
      const diagnostic = toSetupDiagnostic(scan);
      const currentState = await migrateLegacySetupGate();
      const nextState = recordExplicitAccessCheck(
        currentState,
        sources.map((source) => source.id),
        diagnostic,
        new Date(),
      );
      await saveAccessCheckState(nextState);

      const accessCheckResult = summarizeDockScan(sources, scan);
      if (scan.kind === "success" || nextState.setupGate) {
        setState({ kind: "result", value: accessCheckResult, updatedAt: new Date() });
        return;
      }

      setState(accessRequiredState(nextState, sources.length, accessCheckResult));
    } catch {
      setState({ kind: "result", value: { sources: [], aggregate: { kind: "failed" } } });
    } finally {
      accessCheckInProgress.current = false;
    }
  }

  async function openAccessibilitySettings() {
    // macOS does not report whether it actually displayed this settings pane.
    setState((current) =>
      current.kind === "accessCheckRequired" ? { ...current, manualAccessibilityPathShown: true } : current,
    );
    try {
      await open("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
    } catch {
      // The manual path remains available for this menu session.
    }
  }

  if (state.kind === "loading" || state.kind === "checking") {
    return (
      <MenuBarExtra isLoading tooltip="Read Me Maybe" icon={messageIcon} title="-">
        {state.kind === "checking" && <MenuBarExtra.Item title="Checking access..." />}
      </MenuBarExtra>
    );
  }

  if (state.kind === "accessCheckRequired") {
    return (
      <MenuBarExtra icon={messageIcon} title="-" tooltip="Read Me Maybe">
        <MenuBarExtra.Item title={state.prompt.message} />
        {state.prompt.kind !== "noSources" && <MenuBarExtra.Item title="Check Access" onAction={checkAccess} />}
        {(state.prompt.kind === "required" || state.prompt.kind === "accessibilityRequired") && (
          <MenuBarExtra.Item title="Open Accessibility Settings" onAction={openAccessibilitySettings} />
        )}
        {state.manualAccessibilityPathShown && (
          <MenuBarExtra.Item title="System Settings > Privacy & Security > Accessibility" />
        )}
        {state.accessCheckResult?.sources.map((source) => (
          <MenuBarExtra.Item
            key={source.id}
            icon={sourceRowIcon(source.appPath)}
            title={source.name}
            subtitle={source.label}
            onAction={source.openCommand === "" ? undefined : () => runOpenCommand(source.openCommand)}
          />
        ))}
        <MenuBarExtra.Item title="View Unreads" onAction={launchViewUnreads} />
      </MenuBarExtra>
    );
  }

  const presentation = menuPresentation(state.value, state.updatedAt);
  return (
    <MenuBarExtra
      icon={presentation.hasExcludedUnreadActivity ? unreadActivityIcon : messageIcon}
      title={presentation.title}
      tooltip="Read Me Maybe"
    >
      {presentation.status && <MenuBarExtra.Item title={presentation.status} />}
      {presentation.showSources &&
        state.value.sources.map((source) => (
          <MenuBarExtra.Item
            key={source.id}
            icon={sourceRowIcon(source.appPath)}
            title={source.name}
            subtitle={source.label}
            onAction={source.openCommand === "" ? undefined : () => runOpenCommand(source.openCommand)}
          />
        ))}
      {presentation.lastUpdated && <MenuBarExtra.Item title={presentation.lastUpdated} />}
      <MenuBarExtra.Item title="View Unreads" onAction={launchViewUnreads} />
    </MenuBarExtra>
  );
}

// The Catalog reloads on every cycle, so edits show up on the next refresh without a restart.
async function currentSources(): Promise<StoredSource[]> {
  return enabledSources((await loadSourceCatalog()).sources);
}

function accessRequiredState(
  accessState: AccessCheckState,
  sourceCount: number,
  accessCheckResult?: UnreadCountResult,
  livePermissionFailure?: PermissionFailure,
): MenuState {
  return {
    kind: "accessCheckRequired",
    prompt: accessCheckPrompt(accessState, sourceCount, livePermissionFailure),
    manualAccessibilityPathShown: false,
    accessCheckResult,
  };
}

function toSetupDiagnostic(scan: DockScan) {
  return scan.kind === "success" ? { kind: "success" as const } : scan;
}

// The command re-reads the Catalog when it opens, so the menu needs no refresh handshake.
function launchViewUnreads() {
  launchCommand({ name: "view-unreads", type: LaunchType.UserInitiated }).catch(() => {
    // A failed launch leaves the menu unchanged; the action row can be selected again.
  });
}
