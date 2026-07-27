import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";

import { useEffect, useState } from "react";

import { useConfig, useGhStatus, useViewer } from "../../hooks";
import { inQuietHours } from "../../lib/activity";
import { demoModeAvailable, isDemoMode, setDemoMode } from "../../lib/demo";
import { resetGhCaches } from "../../lib/gh-status";
import { avatar } from "../../lib/format";
import { clearSeen } from "../../lib/seen";
import { watchedRepos, watchedTeams } from "../../lib/tabs";
import { IgnoredAuthors } from "./ignored-authors";
import { NotificationSettingsView } from "./notifications";
import { Organizations } from "./organizations";
import { Repositories } from "./repositories";
import { SavedFilters } from "./saved-filters";
import { Teams } from "./teams";

/**
 * The configuration hub. Everything the TUI keeps in its TOML file lives
 * here: org scope, watched repos and teams, the author ignore list, and the
 * saved filters.
 */
export function SettingsView() {
  const { config, update, revalidate } = useConfig();
  const { data: viewer, isLoading } = useViewer();
  const { data: ghStatus, revalidate: revalidateStatus } = useGhStatus();

  const orgSummary = config.activeOrgs.length > 0 ? config.activeOrgs.join(", ") : "Everywhere";
  const teamSummary = viewer
    ? config.watchTeams.length > 0
      ? config.watchTeams.join(", ")
      : `All my teams (${watchedTeams(config, viewer).length})`
    : "—";
  const repoSummary = watchedRepos(config).length > 0 ? `${watchedRepos(config).length} watched` : "None";
  const notifications = config.notifications;
  const quietNow = inQuietHours(notifications);
  const [demoOn, setDemoOn] = useState(false);
  useEffect(() => {
    isDemoMode().then(setDemoOn);
  }, []);
  // A missing read:org doesn't block the extension, but it silently empties
  // the org and team pickers — so say so where those pickers live.
  const missingScopes = ghStatus?.state === "ready" ? ghStatus.missingScopes : [];

  async function resetSeen() {
    await clearSeen();
    await showToast({
      style: Toast.Style.Success,
      title: "Cleared the “new since last look” markers",
    });
  }

  return (
    <List isLoading={isLoading} navigationTitle="Configure GH Review" searchBarPlaceholder="Search settings…">
      {missingScopes.length > 0 ? (
        <List.Section title="Action needed">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
            title={`Token is missing ${missingScopes.join(", ")}`}
            subtitle="Organizations and teams stay empty until you add the scope"
            accessories={[{ tag: { value: "fix me", color: Color.Yellow } }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title="Copy the Fix Command"
                  content={`gh auth refresh -s ${missingScopes.join(",")}`}
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Check Again"
                  onAction={() => {
                    resetGhCaches();
                    revalidateStatus();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Scope">
        <List.Item
          icon={{ source: Icon.Building, tintColor: Color.Blue }}
          title="Organizations"
          subtitle="Which orgs the built-in categories search"
          accessories={[{ text: orgSummary }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Building}
                title="Choose Organizations"
                target={<Organizations />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Binoculars, tintColor: Color.Purple }}
          title="Watched Repositories"
          subtitle="Feeds the “Watching” category"
          accessories={[{ text: repoSummary }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Binoculars}
                title="Choose Repositories"
                target={<Repositories />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.TwoPeople, tintColor: Color.Orange }}
          title="Watched Teams"
          subtitle="Feeds the “My team's review” category"
          accessories={[{ text: teamSummary }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.TwoPeople} title="Choose Teams" target={<Teams />} onPop={revalidate} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title="Default Filter Scope"
          subtitle="What a saved filter with no scopes searches"
          accessories={[
            {
              tag: {
                value: config.defaultScope === "tracked" ? "Watched repos & orgs" : "Everywhere",
                color: config.defaultScope === "tracked" ? Color.Purple : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Switch}
                title={config.defaultScope === "tracked" ? "Search Everywhere" : "Restrict to Watched Repos & Orgs"}
                onAction={() =>
                  update({ ...config, defaultScope: config.defaultScope === "tracked" ? "all" : "tracked" })
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Filtering">
        <List.Item
          icon={{ source: Icon.EyeDisabled, tintColor: Color.Red }}
          title="Ignored Authors"
          subtitle="Bots and accounts hidden from every category"
          accessories={[
            { text: config.ignoredAuthors.length > 0 ? `${config.ignoredAuthors.length} ignored` : "None" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.EyeDisabled}
                title="Manage Ignored Authors"
                target={<IgnoredAuthors />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Bookmark, tintColor: Color.Yellow }}
          title="Saved Filters"
          subtitle="Your own categories, alongside the built-in ones"
          accessories={[{ text: config.filters.length > 0 ? `${config.filters.length} saved` : "None" }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Bookmark}
                title="Manage Saved Filters"
                target={<SavedFilters />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.AppWindowGrid2x2, tintColor: Color.Green }}
          title="Built-in Categories"
          subtitle="Needs my review · team review · my PRs · awaiting my reply"
          accessories={[
            {
              tag: {
                value: config.showBuiltins ? "Shown" : "Hidden",
                color: config.showBuiltins ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Switch}
                title={config.showBuiltins ? "Hide Built-in Categories" : "Show Built-in Categories"}
                onAction={() => update({ ...config, showBuiltins: !config.showBuiltins })}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Notifications">
        <List.Item
          icon={{ source: notifications.enabled ? Icon.Bell : Icon.BellDisabled, tintColor: Color.Orange }}
          title="Desktop Notifications"
          subtitle="Banners, quiet hours, and what you get told about"
          accessories={[
            {
              tag: {
                value: notifications.enabled ? (quietNow ? "On · quiet hours" : "On") : "Off",
                color: notifications.enabled ? (quietNow ? Color.Yellow : Color.Green) : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Bell}
                title="Notification Settings"
                target={<NotificationSettingsView />}
                onPop={revalidate}
              />
              <Action
                icon={Icon.Switch}
                title={notifications.enabled ? "Turn Notifications off" : "Turn Notifications on"}
                onAction={() =>
                  update({ ...config, notifications: { ...notifications, enabled: !notifications.enabled } })
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Tray, tintColor: Color.Blue }}
          title="Activity Inbox"
          subtitle="Everything the background watcher noticed, banner or not"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Tray}
                title="Open Activity Inbox"
                onAction={() => launchCommand({ name: "activity", type: LaunchType.UserInitiated })}
              />
              <Action
                icon={Icon.ArrowClockwise}
                title="Check GitHub Now"
                onAction={() => launchCommand({ name: "watch", type: LaunchType.Background })}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {demoModeAvailable() ? (
        <List.Section title="Development">
          <List.Item
            icon={{ source: Icon.Camera, tintColor: demoOn ? Color.Magenta : Color.SecondaryText }}
            title="Screenshot Demo Mode"
            subtitle="Serve invented data everywhere, so store screenshots leak nothing real"
            accessories={[
              { tag: { value: demoOn ? "On" : "Off", color: demoOn ? Color.Magenta : Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Switch}
                  title={demoOn ? "Turn Demo Mode off" : "Turn Demo Mode on"}
                  onAction={async () => {
                    await setDemoMode(!demoOn);
                    setDemoOn(!demoOn);
                    await showToast({
                      style: Toast.Style.Success,
                      title: demoOn ? "Back to your real data" : "Demo mode on",
                      message: demoOn ? undefined : "Reopen each command to see the invented data",
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Account & Data">
        <List.Item
          icon={viewer ? avatar(viewer.login) : Icon.Person}
          title="Signed in as"
          subtitle={viewer ? `@${viewer.login}` : "Resolving from the gh CLI…"}
          accessories={viewer ? [{ text: `${viewer.orgs.length} orgs · ${viewer.teams.length} teams` }] : []}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Login Command" content="gh auth login --web" />
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Gear, tintColor: Color.SecondaryText }}
          title="Extension Preferences"
          subtitle="gh CLI path, GitHub host, results per category"
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.SecondaryText }}
          title="Reset “New” Markers"
          subtitle="Forget which pull requests you've already looked at"
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowCounterClockwise} title="Reset Markers" onAction={resetSeen} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
