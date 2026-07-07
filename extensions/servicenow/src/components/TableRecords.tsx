import { useEffect, useMemo, useState } from "react";

import { Action, ActionPanel, Color, Icon, Image, Keyboard, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { getAvatarIcon, useFetch } from "@raycast/utils";
import { differenceInCalendarDays, format, isThisYear } from "date-fns";
import { groupBy } from "lodash";

import { DBObject, Instance } from "../types";
import Actions from "./Actions";
import FavoriteForm from "./FavoriteForm";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { getSectionTitle } from "../utils/getSectionTitle";
import { instanceLabel } from "../utils/instanceLabel";
import { useAuthHeader } from "../hooks/useAuthHeader";
import useFavorites from "../hooks/useFavorites";
import useInstances from "../hooks/useInstances";

const FALLBACK_DISPLAY_FIELDS = ["number", "name", "short_description", "title", "u_name"];

const SPECIAL_AVATARS: Record<string, Image.ImageLike> = {
  system: { source: Icon.ComputerChip, tintColor: Color.Purple },
  admin: { source: Icon.Shield, tintColor: Color.Orange },
  guest: { source: Icon.PersonCircle, tintColor: Color.SecondaryText },
  maint: { source: Icon.Cog, tintColor: Color.Blue },
};

interface DictionaryResponse {
  result: { element: string; display: string }[];
}

type TableRecord = {
  sys_id: string;
  sys_updated_on?: string;
  sys_updated_by?: string;
} & Record<string, string | undefined>;

// With sysparm_display_value=all every field arrives as { value, display_value }.
// Null is returned by the API when a field has no value.
type DisplayValuePair = { value: string | null; display_value: string | null } | null;

interface TableRecordsResponse {
  result: Record<string, DisplayValuePair>[];
}

interface LiveProfile {
  sys_id: string;
  photo: string;
  "document.user_name": string;
  "document.name": string;
}

interface LiveProfilesResponse {
  result: LiveProfile[];
}

interface SysUser {
  user_name: string;
  name: string;
  photo?: string;
}

interface SysUsersResponse {
  result: SysUser[];
}

export default function TableRecords({ table, extraQuery }: { table: DBObject; extraQuery?: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const { instances, isLoading: isLoadingInstances, selectedInstance, setSelectedInstance } = useInstances();
  const instanceName = selectedInstance?.name ?? "";
  const instanceId = selectedInstance?.id ?? "";
  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);
  const headers = authHeader ? { Authorization: authHeader } : undefined;
  const { isInFavorites, revalidateFavorites, addUrlToFavorites, removeFromFavorites } = useFavorites();

  const onInstanceChange = (newValue: string) => {
    const found = instances.find((i) => i.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
    }
  };

  // Fetch the table's own columns (display flag included) before the records load.
  // We derive both the display field and — for database views — whether the
  // sys_updated_on column exists, so we can decide the order-by upfront.
  const { data: tableMeta, isLoading: isLoadingDisplay } = useFetch(
    `${instanceUrl}/api/now/table/sys_dictionary?sysparm_query=name=${table.name}^elementISNOTEMPTY&sysparm_fields=element,display&sysparm_limit=2000&sysparm_exclude_reference_link=true`,
    {
      headers,
      execute: !!authHeader,
      keepPreviousData: true,
      mapResult(response: DictionaryResponse) {
        const rows = response.result ?? [];
        return {
          data: {
            displayField: rows.find((r) => r.display === "true")?.element ?? null,
            hasUpdatedOn: rows.some((r) => r.element === "sys_updated_on"),
          },
        };
      },
    },
  );
  const displayField = tableMeta?.displayField ?? null;

  const fields = useMemo(() => {
    const set = new Set<string>(["sys_id", "sys_updated_on", "sys_updated_by", ...FALLBACK_DISPLAY_FIELDS]);
    if (displayField) set.add(displayField);
    return Array.from(set);
  }, [displayField]);

  // Maps each updater login to its photo/display name for the row avatar + tooltip.
  const { data: users = [] } = useFetch(
    `${instanceUrl}/api/now/table/live_profile?sysparm_query=type=user&sysparm_fields=sys_id,photo,document.user_name,document.name`,
    {
      headers,
      execute: !!authHeader,
      keepPreviousData: true,
      mapResult(response: LiveProfilesResponse) {
        return { data: response.result };
      },
    },
  );

  const usersByName = useMemo(
    () => Object.fromEntries(users.map((u) => [u["document.user_name"], u] as const)),
    [users],
  );

  // Fields we'll target with LIKE when the user types a search term. When the
  // dictionary tells us a display field, prefer it. Otherwise we infer from the
  // first unfiltered load which of the common fields are actually present on the
  // table (querying LIKE on a non-existent field would 400 the whole request).
  const [searchableFields, setSearchableFields] = useState<string[]>([]);

  // Ordering by sys_updated_on 500s the whole request when the table lacks that
  // column (database views). For views (v_*) the dictionary lists every column —
  // no inheritance — so its absence there is authoritative and we skip the
  // order-by upfront. For normal tables sys_updated_on is inherited and won't show
  // in the table's own dictionary rows, so we keep ordering on and let the onError
  // fallback below disable it for the rare non-view table that also lacks it.
  const isDatabaseView = table.name.startsWith("v_");
  const [orderByDisabled, setOrderByDisabled] = useState(false);
  const orderByUpdated = !orderByDisabled && (!isDatabaseView || (tableMeta?.hasUpdatedOn ?? true));

  // Shared between the records fetch and the "Open <table> List" action so the
  // browser opens the same filtered view the user is looking at.
  const sysparmQuery = useMemo(() => {
    const terms = searchTerm.trim().split(/\s+/).filter(Boolean);
    const filters: string[] = [];
    if (extraQuery) filters.push(extraQuery);
    // Each term gets its own (displayField OR sys_updated_by) group; groups are
    // ANDed via the `^` join — so "importmate ruben" finds an "Importmate …"
    // record whose updater login contains "ruben".
    for (const term of terms) {
      const orParts: string[] = [];
      if (searchableFields.length > 0) {
        for (const f of searchableFields) orParts.push(`${f}LIKE${term}`);
      } else {
        orParts.push(`123TEXTQUERY321=${term}`);
      }
      orParts.push(`sys_updated_byLIKE${term}`);
      filters.push(orParts.join("^OR"));
    }
    if (orderByUpdated) filters.push("ORDERBYDESCsys_updated_on");
    return filters.join("^");
  }, [searchTerm, extraQuery, searchableFields, orderByUpdated]);

  const { isLoading, data, error, revalidate, pagination } = useFetch(
    (options) => {
      const params = new URLSearchParams({
        sysparm_display_value: "all",
        sysparm_exclude_reference_link: "true",
        sysparm_limit: "100",
        sysparm_offset: String(options.page * 100),
        sysparm_fields: fields.join(","),
        sysparm_query: sysparmQuery,
      });
      return `${instanceUrl}/api/now/table/${table.name}?${params.toString()}`;
    },
    {
      headers,
      execute: !!authHeader && !isLoadingDisplay,
      keepPreviousData: true,
      async parseResponse(response) {
        if (!response.ok) {
          // Tag the status so onError can tell a 500 (unknown ORDERBY column) from
          // a 401/network error that shouldn't trigger the order-by fallback.
          const err = new Error(response.statusText || `HTTP ${response.status}`);
          (err as Error & { status?: number }).status = response.status;
          throw err;
        }
        return response.json();
      },
      onError: (err) => {
        // Only a 500 means the table lacks sys_updated_on (database views aside).
        // Drop the order-by and let the query memo recompute, which retries the
        // fetch automatically. Auth/network errors surface immediately instead.
        if (orderByUpdated && (err as Error & { status?: number }).status === 500) {
          setOrderByDisabled(true);
          return;
        }
        console.error(err);
        showToast(Toast.Style.Failure, "Could not fetch records", err.message);
      },
      mapResult(response: TableRecordsResponse) {
        // Flatten { value, display_value } pairs to the plain string shape the rest
        // of the component expects. Use display_value everywhere except sys_updated_on,
        // where we keep the raw value: it's the internal UTC timestamp
        // (2026-05-20 17:49:24) that `new Date(... + " UTC")` can parse, whereas the
        // display value is localized to the instance's format/timezone and isn't.
        const flattened = response.result.map(
          (rec) =>
            Object.fromEntries(
              Object.entries(rec).map(([key, pair]) => [
                key,
                key === "sys_updated_on" ? pair?.value : pair?.display_value,
              ]),
            ) as TableRecord,
        );
        return { data: flattened, hasMore: response.result.length > 0 };
      },
    },
  );

  useEffect(() => {
    if (displayField) {
      setSearchableFields((prev) => (prev.length === 1 && prev[0] === displayField ? prev : [displayField]));
      return;
    }
    if (!data || data.length === 0) return;
    const next = FALLBACK_DISPLAY_FIELDS.filter((f) => data.slice(0, 5).some((r) => r[f]));
    setSearchableFields((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
  }, [displayField, data]);

  const updatedByUserNames = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    for (const r of data) {
      if (r.sys_updated_by) set.add(String(r.sys_updated_by));
    }
    return Array.from(set);
  }, [data]);

  // Fall back to sys_user for the display name when live_profile has no record
  // (system accounts, integration users, etc. don't always have a live_profile).
  const sysUsersUrl = useMemo(() => {
    if (updatedByUserNames.length === 0) return "";
    const inClause = updatedByUserNames.map((u) => encodeURIComponent(u)).join(",");
    const params = new URLSearchParams({
      sysparm_query: `user_nameIN${inClause}`,
      sysparm_fields: "user_name,name,photo",
      sysparm_limit: String(updatedByUserNames.length),
      sysparm_exclude_reference_link: "true",
    });
    return `${instanceUrl}/api/now/table/sys_user?${params.toString()}`;
  }, [updatedByUserNames, instanceUrl]);

  const { data: sysUsers = [] } = useFetch(sysUsersUrl, {
    headers,
    execute: !!authHeader && sysUsersUrl !== "",
    keepPreviousData: true,
    mapResult(response: SysUsersResponse) {
      return { data: response.result };
    },
  });

  const sysUserByName = useMemo(() => Object.fromEntries(sysUsers.map((u) => [u.user_name, u] as const)), [sysUsers]);

  // ServiceNow pagination can return the same record on two pages when records share
  // sys_updated_on at the boundary or are concurrently modified during paging.
  const dedupedData = useMemo(() => {
    if (!data) return data;
    const seen = new Set<string>();
    return data.filter((r) => {
      if (seen.has(r.sys_id)) return false;
      seen.add(r.sys_id);
      return true;
    });
  }, [data]);

  const resolveTitle = (record: TableRecord): string => {
    if (displayField && record[displayField]) return String(record[displayField]);
    for (const f of FALLBACK_DISPLAY_FIELDS) {
      if (record[f]) return String(record[f]);
    }
    return record.sys_id;
  };

  const resolveSubtitle = (record: TableRecord): string | undefined => {
    const primary = displayField ?? FALLBACK_DISPLAY_FIELDS.find((f) => record[f]);
    if (primary !== "short_description" && record.short_description) return String(record.short_description);
    if (primary !== "number" && record.number) return String(record.number);
    return undefined;
  };

  const listUrl = buildServiceNowUrl(
    instanceName,
    `${table.name}_list.do?sysparm_query=${encodeURIComponent(sysparmQuery)}`,
  );

  const sections = useMemo(
    () => groupBy(dedupedData ?? [], (r) => getSectionTitle(r.sys_updated_on || "")),
    [dedupedData],
  );

  const searchPlaceholder = useMemo(() => {
    const parts = [...searchableFields, "updated by"];
    return `Filter by ${parts.join(", ")}...`;
  }, [searchableFields]);

  return (
    <List
      searchText={searchTerm}
      onSearchTextChange={setSearchTerm}
      isLoading={isLoading || isLoadingDisplay}
      pagination={pagination}
      throttle
      searchBarPlaceholder={searchPlaceholder}
      navigationTitle={`${table.label} (${table.name})`}
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingInstances}
          value={instanceId}
          tooltip="Select the instance you want to search in"
          onChange={(newValue) => {
            !isLoadingInstances && onInstanceChange(newValue);
          }}
        >
          <List.Dropdown.Section title="Instance Profiles">
            {instances.map((instance: Instance) => (
              <List.Dropdown.Item
                key={instance.id}
                title={instanceLabel(instance)}
                value={instance.id}
                icon={{
                  source: instanceId == instance.id ? Icon.CheckCircle : Icon.Circle,
                  tintColor: instance.color,
                }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could Not Fetch Records"
          description="Press ⏎ to refresh or try again later"
          actions={
            <ActionPanel>
              <Actions revalidate={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        Object.keys(sections).map((section) => (
          <List.Section
            key={section}
            title={section}
            subtitle={`${sections[section].length} ${sections[section].length == 1 ? "result" : "results"}`}
          >
            {sections[section].map((record) => {
              const relativeUrl = `${table.name}.do?sys_id=${record.sys_id}`;
              const path = `/${relativeUrl}`;
              const recordUrl = buildServiceNowUrl(instanceName, relativeUrl);
              const title = resolveTitle(record);
              const favoriteId = isInFavorites(path);
              const accessories: List.Item.Accessory[] = [];
              if (favoriteId) {
                accessories.push({
                  icon: { source: Icon.Star, tintColor: Color.Yellow },
                  tooltip: "Favorite",
                });
              }
              const updatedDate = record.sys_updated_on ? new Date(record.sys_updated_on + " UTC") : null;
              if (updatedDate && !isNaN(updatedDate.getTime())) {
                const daysAgo = differenceInCalendarDays(new Date(), updatedDate);
                const dateLabel =
                  daysAgo === 0
                    ? format(updatedDate, "HH:mm")
                    : daysAgo <= 6
                      ? format(updatedDate, "EEE")
                      : isThisYear(updatedDate)
                        ? format(updatedDate, "d MMM")
                        : format(updatedDate, "yyyy");
                accessories.push({
                  text: dateLabel,
                  tooltip: `Updated on: ${format(updatedDate, "EEEE d MMMM yyyy 'at' HH:mm")}`,
                });
              }
              if (record.sys_updated_by) {
                const userName = String(record.sys_updated_by);
                const liveProfile = usersByName[userName];
                const sysUser = sysUserByName[userName];
                const displayName = sysUser?.name ?? liveProfile?.["document.name"] ?? userName;
                const photoPath = liveProfile?.photo || sysUser?.photo;
                const special = SPECIAL_AVATARS[userName.toLowerCase()];
                // Drop decorator tokens like "(Admin)" so initials come from the real name words.
                const trimmed = displayName
                  .trim()
                  .split(/\s+/)
                  .filter((word) => /^\p{L}/u.test(word))
                  .join(" ");
                // getAvatarIcon picks the first letter of the first and last words.
                // Split a single-word name so it still produces two initials (e.g. "system" → "SY").
                const nameForAvatar =
                  trimmed.includes(" ") || trimmed.length < 2 ? trimmed : `${trimmed[0]} ${trimmed.slice(1)}`;
                accessories.push({
                  icon:
                    special ??
                    (photoPath
                      ? { source: `${instanceUrl}/${photoPath}.iix?t=small`, mask: Image.Mask.Circle }
                      : getAvatarIcon(nameForAvatar)),
                  tooltip:
                    displayName === userName
                      ? `Updated by: ${displayName}`
                      : `Updated by: ${displayName} (${userName})`,
                });
              }
              return (
                <List.Item
                  key={record.sys_id}
                  title={title}
                  subtitle={resolveSubtitle(record)}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title={title}>
                        <Action.OpenInBrowser
                          title="Open Record in ServiceNow"
                          url={recordUrl}
                          icon={{ source: "servicenow.svg" }}
                        />
                        <Action.OpenInBrowser
                          title={`Open ${table.label} List`}
                          url={listUrl}
                          icon={{ source: "servicenow.svg" }}
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          title="Copy Record URL"
                          content={recordUrl}
                          shortcut={Keyboard.Shortcut.Common.CopyPath}
                        />
                        <Action.CopyToClipboard
                          title="Copy Sys ID"
                          content={record.sys_id}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                        />
                      </ActionPanel.Section>
                      {!favoriteId && (
                        <Action
                          title="Add Favorite"
                          icon={Icon.Star}
                          onAction={() => addUrlToFavorites(title, relativeUrl)}
                          shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                        />
                      )}
                      {favoriteId && (
                        <>
                          <Action.Push
                            title="Edit Favorite"
                            icon={Icon.Pencil}
                            target={<FavoriteForm favoriteId={favoriteId} />}
                            shortcut={Keyboard.Shortcut.Common.Edit}
                          />
                          <Action
                            title="Remove Favorite"
                            icon={Icon.StarDisabled}
                            style={Action.Style.Destructive}
                            onAction={() => removeFromFavorites(favoriteId, title, false)}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                          />
                        </>
                      )}
                      <Actions
                        revalidate={() => {
                          revalidate();
                          revalidateFavorites();
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
