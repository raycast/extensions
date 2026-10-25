import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { PINNED_HOST_VERSION, installAndRegister, isHostOutdated, updateOutdatedHost } from "./lib/host-update";
import { profilesNeedingSetup } from "./lib/profile-status";
import { ProfileSetupItem, SetupAction } from "./lib/profile-ui";
import { installedHostVersion, isFirefoxInstalled, isNativeHostRegistered } from "./lib/setup";
import { loadProfileStatuses } from "./lib/setup-status";
import { useHostsWatcher } from "./lib/use-hosts-watcher";

export default function SetupBridge() {
  const readHost = () => ({
    registered: isNativeHostRegistered(),
    version: installedHostVersion(),
    outdated: isHostOutdated(),
  });
  const [host, setHost] = useState(readHost);
  const [installing, setInstalling] = useState(false);
  const firefoxInstalled = isFirefoxInstalled();

  const { data: setup, isLoading, revalidate } = usePromise(loadProfileStatuses, []);
  useHostsWatcher(revalidate);

  const install = useCallback(async () => {
    setInstalling(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing Firefox Bridge",
      message: "Downloading native host...",
    });
    const ok = await installAndRegister(toast);
    setHost(readHost());
    setInstalling(false);
    if (!ok) return;

    const { statuses } = await loadProfileStatuses();
    revalidate();
    const pending = profilesNeedingSetup(statuses);
    toast.style = Toast.Style.Success;
    toast.title = "Firefox Bridge Installed";
    toast.message =
      pending.length > 0
        ? `${pending.length} running profile${pending.length === 1 ? " needs" : "s need"} the companion extension`
        : "Restart Firefox if your tabs don't appear";
  }, [revalidate]);

  const update = useCallback(async () => {
    setInstalling(true);
    await updateOutdatedHost();
    setHost(readHost());
    setInstalling(false);
    revalidate();
  }, [revalidate]);

  // Setting up is what this command is for, so install straight away when
  // Firefox can't launch the native host yet, and update it when it is older
  // than the release this extension pins.
  useEffect(() => {
    if (!firefoxInstalled) return;
    if (!host.registered) install();
    else if (host.outdated) update();
  }, []);

  if (!firefoxInstalled) {
    return (
      <List searchBarPlaceholder="Search profiles...">
        <List.EmptyView
          icon={Icon.Globe}
          title="Firefox Not Detected"
          description="Install Firefox in /Applications, then run this command again."
        />
      </List>
    );
  }

  const statuses = setup?.statuses ?? [];
  const profiles = setup?.profiles ?? [];
  // Running profiles first, then the rest in Firefox's order.
  const ordered = [...statuses].sort((a, b) => Number(b.firefoxPid !== null) - Number(a.firefoxPid !== null));

  const refresh = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={() => {
        setHost(readHost());
        revalidate();
      }}
    />
  );
  const installAction = host.outdated ? (
    <Action title={`Update Native Host to ${PINNED_HOST_VERSION}`} icon={Icon.Download} onAction={update} />
  ) : (
    <Action
      title={host.registered ? "Reinstall Native Host" : "Install Native Host"}
      icon={Icon.Download}
      onAction={install}
    />
  );

  return (
    <List isLoading={isLoading || installing} searchBarPlaceholder="Search profiles...">
      <List.Section title="Native Host">
        <List.Item
          icon={Icon.Terminal}
          title="Native Host"
          subtitle={
            host.registered
              ? `Registered with Firefox${host.version ? `, version ${host.version}` : ""}`
              : "Not installed"
          }
          accessories={[
            installing
              ? { tag: { value: "Installing", color: Color.Orange } }
              : !host.registered
              ? { tag: { value: "Missing", color: Color.Orange } }
              : host.outdated
              ? { tag: { value: `Update to ${PINNED_HOST_VERSION}`, color: Color.Orange } }
              : { tag: { value: "Installed", color: Color.Green } },
          ]}
          actions={
            <ActionPanel>
              {installAction}
              {refresh}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Firefox Profiles" subtitle="Each profile needs its own copy of the companion extension">
        {ordered.map((status) => (
          <ProfileSetupItem
            key={status.profile.path}
            status={status}
            profiles={profiles}
            actions={
              <ActionPanel>
                <SetupAction status={status} inSetupCommand />
                {status.state === "not-connected" && installAction}
                {refresh}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
