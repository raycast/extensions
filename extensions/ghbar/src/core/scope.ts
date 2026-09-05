import { RepositoryFilterMode, Settings } from "./settings";

/**
 * The scope selection written by the "Configure Scope" command.
 *
 * Raycast preferences are static — the manifest has no way to offer a live
 * list of organizations or repositories. So the selection lives in
 * `LocalStorage` and layers ON TOP of the preferences.
 *
 * `null` means "not chosen here, the preference wins". An empty ARRAY is not
 * the same thing: it means "I selected none", which is a valid choice.
 * Treating them alike would read clearing every checkbox as "reset".
 *
 * The filter mode is THREE-STATE rather than the two flags `Settings` uses,
 * because there "off" is encoded as an empty list, which leaves nowhere to
 * remember the user's picks while the filter is off.
 */
export interface ScopeOverride {
  version: number;
  organizations: string[] | null;
  /** Selected repositories, KEPT even while the mode is "off" (see above). */
  repoList: string[] | null;
  filterMode: RepositoryFilterMode | null;
}

export const SCOPE_OVERRIDE_VERSION = 1;

export function emptyScopeOverride(): ScopeOverride {
  return { version: SCOPE_OVERRIDE_VERSION, organizations: null, repoList: null, filterMode: null };
}

/** Whether nothing has been chosen — drives the "Reset" action's visibility. */
export function isEmptyScopeOverride(override: ScopeOverride): boolean {
  return override.organizations === null && override.repoList === null && override.filterMode === null;
}

/** A selection replaces the preference; without one the preference stands. */
export function applyScope(base: Settings, override: ScopeOverride): Settings {
  const organizations = override.organizations ?? base.organizations;

  if (override.filterMode === null) {
    return { ...base, organizations };
  }

  const selected = override.repoList ?? base.repoList;
  return {
    ...base,
    organizations,
    repoListIsAllowList: override.filterMode === "allow",
    // "Off ignores the list" — the same rule as in `settingsFromRaw`. It has
    // to hold in both places because the filter can be turned off from the
    // preferences or from this command.
    repoList: override.filterMode === "off" ? [] : selected,
  };
}

/** The mode the command should show: the selection, else derived from preferences. */
export function effectiveFilterMode(override: ScopeOverride, base: Settings): RepositoryFilterMode {
  if (override.filterMode !== null) return override.filterMode;
  if (base.repoListIsAllowList) return "allow";
  return base.repoList.length > 0 ? "deny" : "off";
}

/** The selections the command should show. */
export function effectiveOrganizations(override: ScopeOverride, base: Settings): string[] {
  return override.organizations ?? base.organizations;
}

export function effectiveRepoList(override: ScopeOverride, base: Settings): string[] {
  return override.repoList ?? base.repoList;
}

export function decodeScopeOverride(raw: string | undefined): ScopeOverride {
  if (raw === undefined || raw.length === 0) return emptyScopeOverride();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyScopeOverride();
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return emptyScopeOverride();
  }

  const object = parsed as Record<string, unknown>;
  const stringList = (value: unknown): string[] | null =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
  const mode = object.filterMode;

  return {
    version: typeof object.version === "number" ? object.version : SCOPE_OVERRIDE_VERSION,
    organizations: stringList(object.organizations),
    repoList: stringList(object.repoList),
    filterMode: mode === "off" || mode === "allow" || mode === "deny" ? mode : null,
  };
}

export function encodeScopeOverride(override: ScopeOverride): string {
  return JSON.stringify({ ...override, version: SCOPE_OVERRIDE_VERSION });
}

/** Add if absent, remove if present — the only operation the checkboxes need. */
export function toggle(list: string[], entry: string): string[] {
  return list.includes(entry) ? list.filter((item) => item !== entry) : [...list, entry];
}
