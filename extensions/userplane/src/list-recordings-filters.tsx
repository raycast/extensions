// Pushed <List>-based filter screen. Each row is a real <List.Item> with a primary
// action (vs. dead Form.Description rows). Sort lives in searchBarAccessory +
// List.Dropdown with combined field:direction values. All changes auto-apply —
// there's no Apply button, matching Raycast's "dropdown changes are live" idiom.
//
// Refs:
//   - List.Dropdown + searchBarAccessory:
//     https://developers.raycast.com/api-reference/user-interface/list
//   - searchBarAccessory + onChange precedent (single-select typeahead for teams):
//     https://github.com/raycast/extensions/blob/main/extensions/linear/src/active-cycle.tsx
//   - Why not Form.TagPicker: no async/server search, static items only
//     https://developers.raycast.com/api-reference/user-interface/form

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import type { ListRecordingsFilters, RecordingSortField, SortDirection } from "./api/types";
import { FilterPicker } from "./components/filter-picker";

interface FiltersScreenProps {
  workspaceId: string;
  value: ListRecordingsFilters;
  currentMemberId?: string;
  onChange: (next: ListRecordingsFilters) => void;
}

const DEFAULT_FILTERS: ListRecordingsFilters = {
  projectIds: [],
  linkIds: [],
  creatorIds: [],
  sortBy: "created_at",
  sortDirection: "desc",
};

type SortKey = `${RecordingSortField}:${SortDirection}`;

const SORT_OPTIONS: { value: SortKey; title: string }[] = [
  { value: "created_at:desc", title: "Newest" },
  { value: "created_at:asc", title: "Oldest" },
  { value: "recording_duration:desc", title: "Longest" },
  { value: "recording_duration:asc", title: "Shortest" },
];

export function FiltersScreen({ workspaceId, value, currentMemberId, onChange }: FiltersScreenProps) {
  // Raycast captures Action.Push target props at push time; outer-list re-renders
  // don't propagate new `value` into this pushed screen. Mirror the incoming
  // filters into local state so row accessories, the sort dropdown, and
  // FilterPicker `selected` props all reflect updates across sub-pushes. We
  // forward to the outer list once — on unmount — to avoid a refetch per toggle.
  const [local, setLocal] = useState<ListRecordingsFilters>(value);

  const latestRef = useRef(local);
  latestRef.current = local;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    return () => {
      if (!filtersEqual(latestRef.current, value)) {
        onChangeRef.current(latestRef.current);
      }
    };
  }, []);

  const currentSort: SortKey = `${local.sortBy}:${local.sortDirection}`;

  function setCreators(creatorIds: string[]) {
    setLocal((prev) => ({ ...prev, creatorIds }));
  }
  function setProjects(projectIds: string[]) {
    setLocal((prev) => ({ ...prev, projectIds }));
  }
  function setLinks(linkIds: string[]) {
    setLocal((prev) => ({ ...prev, linkIds }));
  }

  function handleSort(key: string) {
    const [sortBy, sortDirection] = key.split(":") as [RecordingSortField, SortDirection];
    setLocal((prev) => ({ ...prev, sortBy, sortDirection }));
  }

  function resetAll() {
    setLocal({ ...DEFAULT_FILTERS });
  }

  const resetAction = (
    <Action
      title="Reset All Filters"
      icon={Icon.ArrowCounterClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={resetAll}
    />
  );

  return (
    <List
      navigationTitle="Filter & Sort"
      searchBarPlaceholder="Filter & Sort"
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={currentSort} onChange={handleSort}>
          {SORT_OPTIONS.map((o) => (
            <List.Dropdown.Item key={o.value} value={o.value} title={o.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Filter By">
        <List.Item
          icon={Icon.Person}
          title="Creators"
          accessories={[{ text: formatCount(local.creatorIds) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Creators"
                icon={Icon.Pencil}
                target={
                  <FilterPicker
                    workspaceId={workspaceId}
                    type="members"
                    selected={local.creatorIds}
                    onChange={setCreators}
                    currentMemberId={currentMemberId}
                    navigationTitle="Filter by Creators"
                  />
                }
              />
              <Action
                title="Clear Creators"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => setCreators([])}
              />
              {resetAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Folder}
          title="Projects"
          accessories={[{ text: formatCount(local.projectIds) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Projects"
                icon={Icon.Pencil}
                target={
                  <FilterPicker
                    workspaceId={workspaceId}
                    type="projects"
                    selected={local.projectIds}
                    onChange={setProjects}
                    navigationTitle="Filter by Projects"
                  />
                }
              />
              <Action
                title="Clear Projects"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => setProjects([])}
              />
              {resetAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Link}
          title="Links"
          accessories={[{ text: formatCount(local.linkIds) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Links"
                icon={Icon.Pencil}
                target={
                  <FilterPicker
                    workspaceId={workspaceId}
                    type="links"
                    selected={local.linkIds}
                    onChange={setLinks}
                    navigationTitle="Filter by Links"
                  />
                }
              />
              <Action
                title="Clear Links"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => setLinks([])}
              />
              {resetAction}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function formatCount(arr: string[]): string {
  if (arr.length === 0) return "None";
  if (arr.length === 1) return "1 selected";
  return `${arr.length} selected`;
}

function filtersEqual(a: ListRecordingsFilters, b: ListRecordingsFilters): boolean {
  return (
    a.sortBy === b.sortBy &&
    a.sortDirection === b.sortDirection &&
    arrEqual(a.creatorIds, b.creatorIds) &&
    arrEqual(a.projectIds, b.projectIds) &&
    arrEqual(a.linkIds, b.linkIds)
  );
}

function arrEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export { DEFAULT_FILTERS };
