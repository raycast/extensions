import {
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  openExtensionPreferences,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import React from "react";
import { plane, planeClient } from "./api/auth";
import { useMyWorkItems } from "./hooks/useMyWorkItems";
import { getMenuBarTitle, getOpenAssignedWorkItems } from "./helpers/my-work-items";
import { groupByStateGroup } from "./helpers/state-groups";
import { formatWorkItemIdentifier } from "./helpers/identifiers";
import { getWorkItemUrlWithIdentifier } from "./helpers/work-items";
import { describePlaneError } from "./helpers/errors";

const MAX_ITEMS_PER_SECTION = 15;
const BACKGROUND_MAX_AGE_MS = 5 * 60 * 1000;

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function openMyWorkItems() {
  return launchCommand({ name: "my-work-items", type: LaunchType.UserInitiated });
}

function AssignedWorkItemsMenuBar() {
  const preferences = getPreferenceValues<Preferences.AssignedWorkItemsMenuBar>();
  const hasWorkspace = !!planeClient;
  // A background refresh reuses a result My Work Items fetched in the last 5 minutes, saving a full scan.
  const { data, isLoading, error } = useMyWorkItems("assigned", {
    execute: hasWorkspace,
    maxAgeMs: environment.launchType === LaunchType.Background ? BACKGROUND_MAX_AGE_MS : undefined,
  });
  const openItems = getOpenAssignedWorkItems(data?.items ?? [], data?.me?.id);
  const sections = groupByStateGroup(openItems);

  if (!hasWorkspace) {
    // API key users haven't entered a workspace slug yet.
    return preferences.alwaysShow ? (
      <MenuBarExtra icon="plane-icon.png" tooltip="Plane: set up your workspace">
        <MenuBarExtra.Item title="Set Up Plane Workspace…" icon={Icon.Gear} onAction={openMyWorkItems} />
      </MenuBarExtra>
    ) : null;
  }

  if (!preferences.alwaysShow && !isLoading && !error && openItems.length === 0) {
    return null;
  }

  return (
    <MenuBarExtra
      icon="plane-icon.png"
      title={getMenuBarTitle(openItems.length)}
      tooltip={`${openItems.length} open work item(s) assigned to you`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open My Work Items"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={openMyWorkItems}
        />
      </MenuBarExtra.Section>

      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={describePlaneError(error).title}
            subtitle="Couldn't refresh"
            icon={Icon.Warning}
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
      ) : null}

      {!isLoading && openItems.length === 0 && !error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No open work items assigned to you" />
        </MenuBarExtra.Section>
      ) : null}

      {sections.map((section) => (
        <MenuBarExtra.Section key={section.group} title={`${section.title} (${section.items.length})`}>
          {section.items.slice(0, MAX_ITEMS_PER_SECTION).map((item) => {
            const identifier = formatWorkItemIdentifier(item.projectIdentifier, item.sequenceId);
            const url = getWorkItemUrlWithIdentifier(item.workspaceSlug, identifier);
            const icon = item.state ? { source: Icon.Circle, tintColor: item.state.color } : Icon.Circle;
            return (
              <MenuBarExtra.Item
                key={item.id}
                icon={icon}
                title={truncate(item.name, 45)}
                subtitle={identifier}
                tooltip={`${identifier}: ${item.name}`}
                onAction={() =>
                  launchCommand({
                    name: "open-work-item",
                    type: LaunchType.UserInitiated,
                    arguments: { identifier },
                  })
                }
                alternate={
                  <MenuBarExtra.Item
                    icon={Icon.Globe}
                    title={truncate(item.name, 45)}
                    subtitle="Open in Browser"
                    onAction={() => open(url)}
                  />
                }
              />
            );
          })}
          {section.items.length > MAX_ITEMS_PER_SECTION ? (
            <MenuBarExtra.Item
              title={`${section.items.length - MAX_ITEMS_PER_SECTION} more…`}
              onAction={openMyWorkItems}
            />
          ) : null}
        </MenuBarExtra.Section>
      ))}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => openCommandPreferences()}
          alternate={
            <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/**
 * Catches "OAuth request creation is not available when command is launched in background"
 * (menu bar refreshes in the background before the user has signed in) and hides the icon
 * instead of showing an error. Other errors propagate. Pattern from the Linear extension.
 */
class BackgroundAuthBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (error.message.includes("OAuth request creation is not available when command is launched in background")) {
      return null;
    }
    throw error;
  }
}

const AuthorizedMenuBar = withAccessToken(plane)(AssignedWorkItemsMenuBar);

export default function Command() {
  return (
    <BackgroundAuthBoundary>
      <AuthorizedMenuBar />
    </BackgroundAuthBoundary>
  );
}
