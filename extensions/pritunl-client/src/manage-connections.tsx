import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useRef, useState } from "react";
import { isConnecting, Pending, ProfileDetail, statusOf } from "./components/profile-detail";
import { AddProfile } from "./components/add-profile";
import { ProfileLogs } from "./components/profile-logs";
import { confirmRemoveProfile, disconnectProfile, toggleAutostart, toggleConnection } from "./lib/connection";
import { displayName, formatUptime } from "./lib/format";
import { PritunlError } from "./lib/pritunl";
import { readProfileInfos } from "./lib/profile-info";
import { Profile } from "./lib/types";
import { useProfiles } from "./lib/use-profiles";
import { useTraffic } from "./lib/use-traffic";

const REFRESH_MS = 3000;

const RANGES = [
  { title: "Last Minute", value: "60000" },
  { title: "Last 5 Minutes", value: "300000" },
];

function statusIcon(profile: Profile, pending?: Pending): List.Item.Props["icon"] {
  const { color } = statusOf(profile, pending);
  if (pending || isConnecting(profile)) return { source: Icon.CircleProgress, tintColor: color };
  if (profile.connected) return { source: Icon.CircleFilled, tintColor: color };
  return { source: Icon.Circle, tintColor: color };
}

function accessories(profile: Profile, pending: Pending | undefined, showingDetail: boolean): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  // The detail panel already shows these, and the list is narrow next to it.
  if (showingDetail) return items;
  if (profile.system) items.push({ tag: "System" });
  if (pending || isConnecting(profile)) {
    const { label, color } = statusOf(profile, pending);
    items.push({ tag: { value: label, color } });
  } else if (profile.connected) {
    items.push({ icon: Icon.Clock, text: formatUptime(profile.uptime) });
  }
  return items;
}

function toggleTitle(profile: Profile, pending?: Pending): string {
  if (profile.connected) return "Disconnect";
  if (pending === "connecting" || isConnecting(profile)) return "Cancel Connecting";
  return "Connect";
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useProfiles(REFRESH_MS);
  const profiles = data ?? [];
  const [showingDetail, setShowingDetail] = useCachedState("showing-detail", true);
  const [windowMs, setWindowMs] = useCachedState("window-ms", 60_000);
  const [pending, setPending] = useState<Record<string, Pending>>({});
  // Set after an import, so the list moves to the new profile.
  const [focusId, setFocusId] = useState<string>();

  // Loaded for every profile up front, so the panel doesn't redraw once more after each selection.
  const profileIds = profiles.map((p) => p.id).join(",");
  const { data: infos } = useCachedPromise((ids: string) => readProfileInfos(ids ? ids.split(",") : []), [profileIds], {
    keepPreviousData: true,
  });
  // Every connected profile is sampled, so switching between profiles keeps each chart's history.
  const monitorFor = useTraffic(profiles.filter((p) => p.connected).map((p) => p.client_address));

  // Uptime only arrives with each profile refresh. Counting forward from then lets the
  // monitor's clock tick every second along with the traffic samples.
  const fetched = useRef({ data, at: Date.now() });
  if (fetched.current.data !== data) fetched.current = { data, at: Date.now() };
  const uptimeOf = (profile: Profile) =>
    profile.connected ? profile.uptime + (Date.now() - fetched.current.at) / 1000 : 0;

  const active = profiles.filter((p) => p.connected || isConnecting(p) || pending[p.id]);
  const available = profiles.filter((p) => !active.includes(p));

  async function run(action: (profile: Profile) => Promise<void>, profile: Profile) {
    await action(profile);
    revalidate();
  }

  async function toggle(profile: Profile) {
    if (pending[profile.id] === "disconnecting") {
      await showToast({ style: Toast.Style.Failure, title: "Already disconnecting" });
      return;
    }
    // While a connect is still waiting, for example on SSO sign-in, the action cancels it.
    const cancelling = pending[profile.id] === "connecting";
    const next: Pending =
      cancelling || profile.connected || profile.run_state === "Active" ? "disconnecting" : "connecting";
    setPending((current) => ({ ...current, [profile.id]: next }));
    try {
      await run(cancelling ? disconnectProfile : toggleConnection, profile);
    } finally {
      // A cancelled connect finishes after the cancel has started, so only clear what this call set.
      setPending((current) => {
        if (current[profile.id] !== next) return current;
        const rest = { ...current };
        delete rest[profile.id];
        return rest;
      });
    }
  }

  const addProfileAction = (
    <Action.Push
      title="Add Profile"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <AddProfile
          onAdded={(added) => {
            revalidate();
            if (added[0]) setFocusId(added[0].id);
          }}
        />
      }
    />
  );

  async function remove(profile: Profile) {
    if (await confirmRemoveProfile(profile)) revalidate();
  }

  const renderItem = (profile: Profile) => (
    <List.Item
      key={profile.id}
      id={profile.id}
      icon={statusIcon(profile, pending[profile.id])}
      title={displayName(profile)}
      subtitle={!showingDetail && profile.connected ? profile.client_address : undefined}
      keywords={[profile.name]}
      accessories={accessories(profile, pending[profile.id], showingDetail)}
      detail={
        <ProfileDetail
          profile={profile}
          pending={pending[profile.id]}
          monitor={profile.connected ? monitorFor(profile.client_address) : undefined}
          windowMs={windowMs}
          uptime={uptimeOf(profile)}
          info={infos?.[profile.id]}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={toggleTitle(profile, pending[profile.id])}
              icon={profile.connected ? Icon.Power : Icon.Plug}
              onAction={() => toggle(profile)}
            />
            <Action
              title={showingDetail ? "Hide Network Monitor" : "Show Network Monitor"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => setShowingDetail((value) => !value)}
            />
            <Action
              title={windowMs === 60_000 ? "Show Last 5 Minutes" : "Show Last Minute"}
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => setWindowMs(windowMs === 60_000 ? 300_000 : 60_000)}
            />
            <Action.Push
              title="View Logs"
              icon={Icon.Document}
              target={<ProfileLogs profile={profile} />}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {profile.connected && (
              <Action.CopyToClipboard
                title="Copy Client IP"
                content={profile.client_address}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            {profile.system && (
              <Action
                title={profile.state === "Enabled" ? "Turn off Autostart" : "Turn on Autostart"}
                icon={Icon.Repeat}
                onAction={() => run(toggleAutostart, profile)}
              />
            )}
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {addProfileAction}
            <Action
              title="Remove Profile"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => remove(profile)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  if (error) {
    const missingCli = error instanceof PritunlError && error.missingCli;
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title={missingCli ? "Pritunl isn't installed" : "Couldn't load profiles"}
          description={missingCli ? `${error.message}. Install Pritunl or fix the path in preferences.` : error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && profiles.length > 0}
      searchBarPlaceholder="Search profiles"
      selectedItemId={focusId}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Traffic History"
          value={String(windowMs)}
          onChange={(value) => setWindowMs(Number(value))}
        >
          {RANGES.map((range) => (
            <List.Dropdown.Item key={range.value} title={range.title} value={range.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Network}
        title="No profiles"
        description="Press ⌘N to import one from a profile link or file."
        actions={<ActionPanel>{addProfileAction}</ActionPanel>}
      />
      <List.Section title="Connected" subtitle={active.length ? String(active.length) : undefined}>
        {active.map(renderItem)}
      </List.Section>
      <List.Section title="Available Connections" subtitle={available.length ? String(available.length) : undefined}>
        {available.map(renderItem)}
      </List.Section>
    </List>
  );
}
