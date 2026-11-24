import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useState } from "react";
import { LDFlag, StoredFlagRef } from "../types";
import { useShowNamePreference } from "../hooks/useShowNamePreference";
import { FlagFilterValue, useLDFlags } from "../hooks/useLDFlags";
import { useProjectKey } from "../hooks/useProjectKey";
import { useEnvironments, useFlagTags, useMe } from "../hooks/useLDMetadata";
import { useFavorites, useRecents, toFlagRef } from "../hooks/useStoredFlags";
import { getFullName } from "../utils/avatarUtils";
import { getFlagUrl } from "../utils/ld-urls";
import FlagDetails from "../components/FlagDetails";
import SwitchProject from "../components/SwitchProject";
import RecentChanges from "./RecentChanges";
import { FlagActionContext, FlagOpenActions, FlagSecondaryActions } from "../components/FlagActions";
import { FlagMetadata } from "../components/FlagDetailsHeader";
import { RECENT_CHANGES_SHORTCUT, SWITCH_PROJECT_SHORTCUT, TOGGLE_NAME_SHORTCUT } from "../utils/shortcuts";

interface ViewActionsProps {
  showName: boolean;
  onToggleShowName: () => void;
  onRefresh: () => void;
}

/** Actions that apply to the whole list rather than a single flag. */
function ViewActions({ showName, onToggleShowName, onRefresh }: ViewActionsProps) {
  return (
    <ActionPanel.Section title="View">
      {/* Push the command wrapper, not AuditLogList with a fixed projectKey, so
          switching projects from inside the history view updates it too. */}
      <Action.Push
        icon={Icon.Clock}
        title="Show Recent Changes"
        shortcut={RECENT_CHANGES_SHORTCUT}
        target={<RecentChanges />}
      />
      <Action.Push
        icon={Icon.Switch}
        title="Switch Project"
        shortcut={SWITCH_PROJECT_SHORTCUT}
        target={<SwitchProject />}
      />
      <Action
        icon={Icon.Text}
        title={showName ? "Show Flag Keys" : "Show Flag Names"}
        shortcut={TOGGLE_NAME_SHORTCUT}
        onAction={onToggleShowName}
      />
      <Action
        icon={Icon.ArrowClockwise}
        title="Refresh"
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel.Section>
  );
}

interface FlagListItemProps extends FlagActionContext {
  flag: LDFlag;
  showName: boolean;
  envKeys: string[];
  viewActions: React.ReactNode;
}

function FlagListItem({ flag, showName, envKeys, viewActions, ...context }: FlagListItemProps) {
  const { isFavorite } = useFavorites(context.projectKey);
  const { recordVisit } = useRecents(context.projectKey);
  const maintainer = flag._maintainer;
  const icon = maintainer ? getAvatarIcon(getFullName(maintainer) || "?") : Icon.Person;
  const url = getFlagUrl(context.projectKey, flag.key, envKeys);
  const accessories: List.Item.Accessory[] = [];
  if (isFavorite(flag)) accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
  if (flag.temporary) accessories.push({ tag: "Temporary" });

  return (
    <List.Item
      id={flag.key}
      icon={icon}
      title={showName ? flag.name || flag.key : flag.key}
      subtitle={showName ? undefined : flag.name}
      keywords={[flag.key, flag.name, ...(flag.tags ?? [])]}
      accessories={accessories}
      detail={<List.Item.Detail metadata={<FlagMetadata flag={flag} />} />}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            title="Show Details"
            target={<FlagDetails flagKey={flag.key} initialFlag={flag} {...context} />}
            onPush={() => recordVisit(toFlagRef(context.projectKey, flag))}
          />
          <FlagOpenActions flag={flag} url={url} {...context} />
          <FlagSecondaryActions flag={flag} url={url} {...context} />
          {viewActions}
        </ActionPanel>
      }
    />
  );
}

interface StoredFlagItemProps extends FlagActionContext {
  flagRef: StoredFlagRef;
  icon: Icon;
  envKeys: string[];
  viewActions: React.ReactNode;
  extraActions?: React.ReactNode;
}

/** A favorite or recently viewed flag; only the key and name are known until details are opened. */
function StoredFlagItem({ flagRef: ref, icon, envKeys, viewActions, extraActions, ...context }: StoredFlagItemProps) {
  const { recordVisit } = useRecents(context.projectKey);
  const url = getFlagUrl(context.projectKey, ref.key, envKeys);
  return (
    <List.Item
      id={`${icon}:${ref.key}`}
      icon={icon}
      title={ref.name || ref.key}
      subtitle={ref.key}
      keywords={[ref.key]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={ref.name || ref.key} />
              <List.Item.Detail.Metadata.Label title="Key" text={ref.key} />
              {ref.visitedAt && (
                <List.Item.Detail.Metadata.Label title="Last Viewed" text={new Date(ref.visitedAt).toLocaleString()} />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="" text="Press ↵ to load the full flag details" />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            title="Show Details"
            target={<FlagDetails flagKey={ref.key} {...context} />}
            onPush={() => recordVisit(ref)}
          />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Open in LaunchDarkly"
            url={url}
            onOpen={() => recordVisit(ref)}
          />
          <Action.CopyToClipboard
            title="Copy Feature Flag Key"
            content={ref.key}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {extraActions}
          {viewActions}
        </ActionPanel>
      }
    />
  );
}

export default function ListFeatureFlags() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FlagFilterValue>("state:live");
  const { showName, toggleShowName } = useShowNamePreference();

  const { projectKey, isLoading: projectLoading } = useProjectKey();
  const { me, isLoading: meLoading } = useMe();
  const tags = useFlagTags();
  const { environments } = useEnvironments(projectKey, !projectLoading);
  const { favorites, toggleFavorite } = useFavorites(projectKey);
  const { recents, clearRecents } = useRecents(projectKey);

  // "My Flags" needs the caller's member ID; if that lookup fails (e.g. a service
  // token), fall back to Live rather than showing an empty list forever.
  const effectiveFilter: FlagFilterValue = filter === "mine" && !me && !meLoading ? "state:live" : filter;

  const { flags, totalCount, isLoading, error, pagination, revalidate } = useLDFlags({
    projectKey,
    searchText,
    filter: effectiveFilter,
    memberId: me?._id,
    enabled: !projectLoading,
  });

  const context: FlagActionContext = { projectKey };
  const envKeys = environments.map((env) => env.key);
  const showStored = searchText.trim() === "" && filter === "state:live";
  const favoriteKeys = new Set(favorites.map((f) => f.key));
  const recentsToShow = recents.filter((r) => !favoriteKeys.has(r.key)).slice(0, 5);

  const viewActions = <ViewActions showName={showName} onToggleShowName={toggleShowName} onRefresh={revalidate} />;

  return (
    <List
      isLoading={isLoading || projectLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search flags in ${projectKey}…`}
      navigationTitle={`Feature Flags · ${projectKey}`}
      isShowingDetail
      filtering={false}
      throttle
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Flags" storeValue onChange={(value) => setFilter(value as FlagFilterValue)}>
          <List.Dropdown.Section title="State">
            <List.Dropdown.Item title="Live" value="state:live" icon={Icon.Circle} />
            <List.Dropdown.Item title="Deprecated" value="state:deprecated" icon={Icon.Warning} />
            <List.Dropdown.Item title="Archived" value="state:archived" icon={Icon.Tray} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Type">
            <List.Dropdown.Item title="Temporary" value="type:temporary" icon={Icon.Hourglass} />
            <List.Dropdown.Item title="Permanent" value="type:permanent" icon={Icon.Lock} />
          </List.Dropdown.Section>
          {me && (
            <List.Dropdown.Section title="Ownership">
              <List.Dropdown.Item title="My Flags" value="mine" icon={Icon.Person} />
            </List.Dropdown.Section>
          )}
          {tags.length > 0 && (
            <List.Dropdown.Section title="Tags">
              {tags.map((tag) => (
                <List.Dropdown.Item key={tag} title={tag} value={`tag:${tag}`} icon={Icon.Tag} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load flags"
          description={error.message}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={revalidate} />
              <Action.Push icon={Icon.Switch} title="Switch Project" target={<SwitchProject />} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {showStored && favorites.length > 0 && (
            <List.Section title="Favorites">
              {favorites.map((ref) => (
                <StoredFlagItem
                  key={`fav:${ref.key}`}
                  flagRef={ref}
                  icon={Icon.Star}
                  envKeys={envKeys}
                  viewActions={viewActions}
                  extraActions={
                    <Action
                      icon={Icon.StarDisabled}
                      title="Remove from Favorites"
                      shortcut={Keyboard.Shortcut.Common.Pin}
                      onAction={() => toggleFavorite(ref)}
                    />
                  }
                  {...context}
                />
              ))}
            </List.Section>
          )}
          {showStored && recentsToShow.length > 0 && (
            <List.Section title="Recently Viewed">
              {recentsToShow.map((ref) => (
                <StoredFlagItem
                  key={`recent:${ref.key}`}
                  flagRef={ref}
                  icon={Icon.Clock}
                  envKeys={envKeys}
                  viewActions={viewActions}
                  extraActions={
                    <Action
                      icon={Icon.Trash}
                      title="Clear Recently Viewed"
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={clearRecents}
                    />
                  }
                  {...context}
                />
              ))}
            </List.Section>
          )}
          <List.Section title="Feature Flags" subtitle={totalCount ? `${totalCount} flags` : undefined}>
            {flags.map((flag) => (
              <FlagListItem
                key={flag.key}
                flag={flag}
                showName={showName}
                envKeys={envKeys}
                viewActions={viewActions}
                {...context}
              />
            ))}
          </List.Section>
          {!isLoading && flags.length === 0 && (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title="No flags found"
              description={
                searchText
                  ? `Nothing matches "${searchText}" in ${projectKey}`
                  : `No flags in ${projectKey} for this filter`
              }
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Switch} title="Switch Project" target={<SwitchProject />} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
