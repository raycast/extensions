import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { getAccessToken, useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { Catalog, repositoryName } from "./core/models";
import {
  ScopeOverride,
  effectiveFilterMode,
  effectiveOrganizations,
  effectiveRepoList,
  emptyScopeOverride,
  isEmptyScopeOverride,
  toggle,
} from "./core/scope";
import { RepositoryFilterMode } from "./core/settings";
import { fetchCatalog } from "./github/client";
import { github } from "./oauth";
import { settings as preferenceSettings } from "./preferences";
import { clearScopeOverride, loadScopeOverride, saveScopeOverride } from "./state/scopeStore";

const MENU_BAR_COMMAND = "ghbar";

const FILTER_MODES: { mode: RepositoryFilterMode; title: string; description: string }[] = [
  { mode: "off", title: "Off — watch everything", description: "The repository list below is ignored" },
  { mode: "allow", title: "Only these repositories", description: "Nothing outside the selection is shown" },
  { mode: "deny", title: "Everything except these", description: "The selection is excluded" },
];

function Command() {
  const { data, isLoading, error } = useCachedPromise(
    async (): Promise<{ catalog: Catalog; override: ScopeOverride }> => {
      const { token } = getAccessToken();
      const [catalog, override] = await Promise.all([fetchCatalog(token), loadScopeOverride()]);
      return { catalog, override };
    },
    [],
    { keepPreviousData: true },
  );

  // Held locally and written on every change. This is a `view` command, so
  // the process lives until the user closes it and the menu-bar `isLoading`
  // problem does not apply.
  const [draft, setDraft] = useState<ScopeOverride | null>(null);
  const override = draft ?? data?.override ?? emptyScopeOverride();

  const organizations = effectiveOrganizations(override, preferenceSettings);
  const repoList = effectiveRepoList(override, preferenceSettings);
  const filterMode = effectiveFilterMode(override, preferenceSettings);

  async function commit(next: ScopeOverride) {
    setDraft(next);
    await saveScopeOverride(next);
    // The menu bar reads the scope in its own run; nudge it to refresh now.
    try {
      await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background });
    } catch {
      /* the next refresh recovers it */
    }
  }

  async function reset() {
    setDraft(emptyScopeOverride());
    await clearScopeOverride();
    try {
      await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background });
    } catch {
      /* the next refresh recovers it */
    }
    await showToast({ style: Toast.Style.Success, title: "Back to preferences" });
  }

  const resetAction = !isEmptyScopeOverride(override) ? (
    <Action
      title="Reset to Preferences"
      icon={Icon.Undo}
      onAction={reset}
      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
    />
  ) : null;

  const preferencesAction = (
    <Action title="Open Command Preferences" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
  );

  const catalog = data?.catalog;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search organizations and repositories…">
      {error && (
        <List.Section title="Couldn't load the list">
          <List.Item
            title={error instanceof Error ? error.message : String(error)}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            // Even without the list the user can still configure scope via
            // the preference textfields, so point there.
            actions={<ActionPanel>{preferencesAction}</ActionPanel>}
          />
        </List.Section>
      )}

      <List.Section
        title="Organizations"
        subtitle={
          organizations.length > 0
            ? "Watched accounts are ignored while any organization is selected"
            : "None selected — your own repositories are watched"
        }
      >
        {(catalog?.organizations ?? []).map((org) => {
          const selected = organizations.includes(org);
          return (
            <List.Item
              key={org}
              title={org}
              icon={{
                source: selected ? Icon.CheckCircle : Icon.Circle,
                tintColor: selected ? Color.Green : undefined,
              }}
              accessories={selected ? [{ tag: { value: "assigned to me", color: Color.Green } }] : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title={selected ? "Unselect Organization" : "Select Organization"}
                    icon={Icon.Checkmark}
                    onAction={() => commit({ ...override, organizations: toggle(organizations, org) })}
                  />
                  {resetAction}
                  {preferencesAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Repository Filter">
        {FILTER_MODES.map(({ mode, title, description }) => {
          const active = filterMode === mode;
          return (
            <List.Item
              key={mode}
              title={title}
              subtitle={description}
              icon={{
                source: active ? Icon.CheckCircle : Icon.Circle,
                tintColor: active ? Color.Green : undefined,
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="Use This Mode"
                    icon={Icon.Checkmark}
                    onAction={() => commit({ ...override, filterMode: mode, repoList })}
                  />
                  {resetAction}
                  {preferencesAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section
        title="Repositories"
        subtitle={
          filterMode === "off"
            ? "The filter is off, so this selection has no effect yet"
            : `${repoList.length} selected`
        }
      >
        {(catalog?.repositories ?? []).map((repo) => {
          const selected = repoList.includes(repo.nameWithOwner);
          return (
            <List.Item
              key={repo.nameWithOwner}
              title={repositoryName(repo.nameWithOwner)}
              subtitle={repo.nameWithOwner}
              icon={{
                source: selected ? Icon.CheckCircle : Icon.Circle,
                tintColor: selected ? Color.Green : undefined,
              }}
              accessories={repo.isPrivate ? [{ icon: Icon.Lock, tooltip: "Private" }] : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title={selected ? "Unselect Repository" : "Select Repository"}
                    icon={Icon.Checkmark}
                    onAction={() =>
                      commit({
                        ...override,
                        repoList: toggle(repoList, repo.nameWithOwner),
                        // Selecting a repository means the user wants the
                        // filter on; leaving it "off" would silently make the
                        // selection inert. An existing mode is left alone.
                        filterMode: filterMode === "off" ? "allow" : filterMode,
                      })
                    }
                  />
                  {resetAction}
                  {preferencesAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default withAccessToken(github)(Command);
