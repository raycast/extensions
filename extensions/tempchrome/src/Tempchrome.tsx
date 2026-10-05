import { Action, ActionPanel, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import type { JSX } from "react";
import InstallView from "./install/InstallView";
import { launchWithValues } from "./launch";
import LaunchOptionsForm from "./options/LaunchOptionsForm";
import RecentLaunchesList from "./options/RecentLaunchesList";
import { schemaDefaults } from "./options/schema";
import ProfileList from "./profiles/ProfileList";

async function handleLaunch(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Launching TempChrome…",
  });
  const ok = await launchWithValues(schemaDefaults());
  if (ok) {
    toast.hide();
    await popToRoot({ clearSearchBar: true });
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Launch failed";
  }
}

export default function Command(): JSX.Element {
  return (
    <List navigationTitle="TempChrome" searchBarPlaceholder="Search actions…">
      <List.Item
        icon={Icon.Rocket}
        title="Launch Now"
        subtitle="Fresh temp profile · default options"
        accessories={[{ text: "↵" }]}
        actions={
          <ActionPanel>
            <Action title="Launch" icon={Icon.Rocket} onAction={handleLaunch} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Gear}
        title="Launch with Options…"
        subtitle="Pick flags before launching"
        accessories={[{ tag: "⌘L" }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={<LaunchOptionsForm />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Clock}
        title="Recent Launches…"
        subtitle="Replay a recent configured launch"
        accessories={[{ tag: "⌘R" }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open"
              icon={Icon.Clock}
              // Common.Refresh is also cmd+R, but this opens a list, it does not refresh one.
              // The row advertises this exact key through its accessory tag.
              // eslint-disable-next-line @raycast/prefer-common-shortcut
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              target={<RecentLaunchesList />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Folder}
        title="Manage Temp Profiles…"
        subtitle="List, relaunch, or delete existing temp profiles"
        accessories={[{ tag: "⌘M" }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              target={<ProfileList />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Download}
        title="Install or Update Chromium…"
        subtitle="Download and install the latest Chromium snapshot"
        accessories={[{ tag: "⌘I" }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Install"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              target={<InstallView />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
