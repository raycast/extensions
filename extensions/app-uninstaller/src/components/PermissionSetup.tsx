import { Action, ActionPanel, Color, Icon, List, open, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  allGranted,
  APP_MANAGEMENT_SETTINGS,
  checkPermissions,
  FULL_DISK_SETTINGS,
  mergePermissions,
  samePermissions,
  type PermissionState,
  type Permissions,
} from "../lib/permissions";

/** How often to re-read the permissions while this screen is open. */
const POLL_MS = 2000;

const STATE_TAG: Record<PermissionState, { value: string; color: Color }> = {
  granted: { value: "Granted", color: Color.Green },
  denied: { value: "Not granted", color: Color.Orange },
  unknown: { value: "Unknown", color: Color.SecondaryText },
};

const STATE_ICON: Record<PermissionState, { source: Icon; tintColor: Color }> = {
  granted: { source: Icon.CheckCircle, tintColor: Color.Green },
  denied: { source: Icon.Circle, tintColor: Color.Orange },
  unknown: { source: Icon.QuestionMark, tintColor: Color.SecondaryText },
};

/**
 * Shown before the application list on first run.
 *
 * Both permissions are refused silently by macOS and would otherwise only
 * surface as a failed removal. The screen re-reads them while it is open and
 * closes itself as soon as both are granted, so granting them is the only thing
 * left to do.
 */
export function PermissionSetup({ onDone, autoDismiss = true }: { onDone: () => void; autoDismiss?: boolean }) {
  const [data, setData] = useState<Permissions | null>(null);
  const dismissed = useRef(false);

  // Chained timeouts rather than an interval, so a slow read can never overlap
  // the next one, and an empty dependency list, so the loop is created exactly
  // once instead of being torn down and rebuilt on every render.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const next = await checkPermissions();
      if (cancelled) return;
      // Only replace state when something actually changed: a re-render for an
      // identical reading is what made the row flicker.
      setData((previous) => {
        const merged = mergePermissions(previous, next);
        return samePermissions(previous, merged) ? previous : merged;
      });
      timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Only the first run closes itself. Opened deliberately from the list, the
  // screen stays put even when there is nothing left to grant.
  useEffect(() => {
    if (!autoDismiss || !data || dismissed.current || !allGranted(data)) return;
    dismissed.current = true;
    showToast({ style: Toast.Style.Success, title: "All set", message: "Both permissions are granted" });
    onDone();
  }, [autoDismiss, data, onDone]);

  async function revalidate() {
    const next = await checkPermissions();
    setData((previous) => mergePermissions(previous, next));
  }

  async function openSettings(url: string, what: string) {
    await open(url);
    await showToast({
      style: Toast.Style.Success,
      title: `Opened ${what}`,
      message: "Turn on Raycast — this screen closes itself once both are on",
    });
  }

  const continueAction = (
    <Action
      icon={Icon.ArrowRight}
      title="Continue to App Uninstaller"
      shortcut={{ modifiers: ["cmd"], key: "return" }}
      onAction={onDone}
    />
  );

  const recheckAction = (
    <Action
      icon={Icon.ArrowClockwise}
      title="Check Again"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  const appManagement = data?.appManagement ?? "unknown";
  const fullDisk = data?.fullDisk ?? "unknown";

  return (
    <List isLoading={data === null} navigationTitle="Permissions">
      <List.Section title="Grant these first" subtitle="macOS refuses both silently">
        <List.Item
          icon={STATE_ICON[appManagement]}
          title="App Management"
          subtitle="Lets Raycast move an application to the Trash"
          accessories={[{ tag: STATE_TAG[appManagement] }]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Gear}
                title="Open App Management Settings"
                onAction={() => openSettings(APP_MANAGEMENT_SETTINGS, "App Management")}
              />
              {continueAction}
              {recheckAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={STATE_ICON[fullDisk]}
          title="Full Disk Access"
          subtitle="Lets Raycast remove sandboxed apps' containers, as App Store apps use"
          accessories={[{ tag: STATE_TAG[fullDisk] }]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Gear}
                title="Open Full Disk Access Settings"
                onAction={() => openSettings(FULL_DISK_SETTINGS, "Full Disk Access")}
              />
              {continueAction}
              {recheckAction}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="How">
        <List.Item
          icon={Icon.Info}
          title="Turn on Raycast in the list, then let macOS relaunch it"
          subtitle="If Raycast is not listed, add it with the + button"
          actions={<ActionPanel>{continueAction}</ActionPanel>}
        />
        {appManagement === "unknown" && (
          <List.Item
            icon={{ source: Icon.QuestionMark, tintColor: Color.SecondaryText }}
            title="App Management cannot be read without Full Disk Access"
            subtitle="Grant Full Disk Access and this will report itself accurately"
            actions={<ActionPanel>{continueAction}</ActionPanel>}
          />
        )}
        <List.Item
          icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
          title="Continue to App Uninstaller"
          subtitle="You can continue without these — removals that need them will say so and offer a retry"
          actions={
            <ActionPanel>
              {continueAction}
              {recheckAction}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
