import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Domain, Link, Member, Project, PublicSearchLink, SearchType } from "../api/types";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useDomains } from "../hooks/use-domains";
import { useLinks } from "../hooks/use-links";
import { useMembers } from "../hooks/use-members";
import { useProjects } from "../hooks/use-projects";
import { useWorkspaceSearch } from "../hooks/use-workspace-search";

interface DisplayItem {
  id: string;
  title: string;
  subtitle?: string;
  defaultBadge?: boolean;
}

interface FilterPickerProps {
  workspaceId: string;
  type: SearchType;
  selected: string[];
  onChange: (next: string[]) => void;
  currentMemberId?: string;
  navigationTitle?: string;
}

export function FilterPicker({
  workspaceId,
  type,
  selected,
  onChange,
  currentMemberId,
  navigationTitle,
}: FilterPickerProps) {
  const [searchText, setSearchText] = useState("");
  const debounced = useDebouncedValue(searchText.trim(), 300);
  const observed = useRef<Map<string, DisplayItem>>(new Map());
  // Raycast captures Action.Push target props at push time; parent re-renders
  // don't propagate down to the already-mounted child. Keep the picker's own
  // selection state locally so toggles reflect immediately, and still forward
  // every change to the parent via onChange so popping back shows fresh counts.
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  const members = useMembers(type === "members" ? workspaceId : undefined);
  const projects = useProjects(type === "projects" ? workspaceId : undefined);
  const domains = useDomains(type === "domains" ? workspaceId : undefined);
  const links = useLinks(type === "links" ? workspaceId : undefined);

  const search = useWorkspaceSearch(workspaceId, type, debounced);

  const initialItems = useMemo<DisplayItem[]>(() => {
    if (type === "members") {
      return (members.data?.workspaceMembers ?? []).map((m) => memberToDisplay(m, currentMemberId));
    }
    if (type === "projects") {
      return (projects.data?.projects ?? []).map(projectToDisplay);
    }
    if (type === "domains") {
      return (domains.data?.domains ?? []).map(domainToDisplay);
    }
    return (links.data ?? []).map(linkToDisplay);
  }, [type, members.data, projects.data, domains.data, links.data, currentMemberId]);

  const searchItems = useMemo<DisplayItem[]>(() => {
    const data = search.data;
    if (!data) return [];
    if (data.type === "members") {
      return data.results.map((m) => memberToDisplay(m, currentMemberId));
    }
    if (data.type === "projects") {
      return data.results.map(projectToDisplay);
    }
    if (data.type === "domains") {
      return data.results.map(domainToDisplay);
    }
    return data.results.map(linkToDisplay);
  }, [search.data, currentMemberId]);

  const currentItems = debounced ? searchItems : initialItems;

  useEffect(() => {
    for (const item of currentItems) {
      observed.current.set(item.id, item);
    }
  }, [currentItems]);

  const currentIds = new Set(currentItems.map((i) => i.id));
  const selectedOutOfBand: DisplayItem[] = localSelected
    .filter((id) => !currentIds.has(id))
    .map((id) => observed.current.get(id) ?? { id, title: placeholderTitle(id, type) });

  function toggle(id: string) {
    const next = localSelected.includes(id) ? localSelected.filter((x) => x !== id) : [...localSelected, id];
    setLocalSelected(next);
    onChange(next);
  }

  const initialLoading =
    type === "members"
      ? members.isLoading
      : type === "projects"
        ? projects.isLoading
        : type === "domains"
          ? domains.isLoading
          : links.isLoading;

  const isLoading = debounced ? search.isLoading : initialLoading;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder(type)}
      navigationTitle={navigationTitle}
    >
      {selectedOutOfBand.length > 0 ? (
        <List.Section title="Selected">
          {selectedOutOfBand.map((item) => (
            <FilterPickerRow key={`selected-${item.id}`} item={item} type={type} isSelected onToggle={toggle} />
          ))}
        </List.Section>
      ) : null}
      <List.Section title={debounced ? "Results" : "Recent"}>
        {currentItems.map((item) => (
          <FilterPickerRow
            key={item.id}
            item={item}
            type={type}
            isSelected={localSelected.includes(item.id)}
            onToggle={toggle}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface FilterPickerRowProps {
  item: DisplayItem;
  type: SearchType;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

function FilterPickerRow({ item, type, isSelected, onToggle }: FilterPickerRowProps) {
  const accessories: List.Item.Accessory[] = [];
  if (item.defaultBadge) accessories.push({ text: "Default" });
  if (isSelected) accessories.push({ icon: Icon.CheckCircle });

  return (
    <List.Item
      title={item.title}
      subtitle={item.subtitle}
      icon={iconForType(type)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={isSelected ? "Deselect" : "Select"}
            icon={isSelected ? Icon.XMarkCircle : Icon.Checkmark}
            onAction={() => onToggle(item.id)}
          />
        </ActionPanel>
      }
    />
  );
}

function memberToDisplay(m: Member, currentMemberId?: string): DisplayItem {
  const isSelf = m.workspaceMemberId === currentMemberId;
  return {
    id: m.workspaceMemberId,
    title: isSelf ? `${m.memberName} (You)` : m.memberName,
    subtitle: m.memberEmail,
  };
}

function projectToDisplay(p: Project): DisplayItem {
  return {
    id: p.projectId,
    title: p.projectTitle || "Untitled project",
    defaultBadge: p.isDefault,
  };
}

function linkToDisplay(l: Link | PublicSearchLink): DisplayItem {
  if ("project" in l) {
    return {
      id: l.linkId,
      title: l.linkTitle || l.domain.url,
      subtitle: l.project.title ?? undefined,
    };
  }
  return {
    id: l.linkId,
    title: l.linkTitle || l.domainUrl,
    subtitle: l.projectTitle,
  };
}

function domainToDisplay(d: Domain): DisplayItem {
  return {
    id: d.domainId,
    title: d.domainUrl,
  };
}

function iconForType(type: SearchType): Icon {
  switch (type) {
    case "members":
      return Icon.Person;
    case "projects":
      return Icon.Folder;
    case "links":
      return Icon.Link;
    case "domains":
      return Icon.Globe;
  }
}

function searchPlaceholder(type: SearchType): string {
  switch (type) {
    case "members":
      return "Search members…";
    case "projects":
      return "Search projects…";
    case "links":
      return "Search links…";
    case "domains":
      return "Search domains…";
  }
}

function placeholderTitle(id: string, type: SearchType): string {
  const short = id.length > 8 ? `${id.slice(0, 8)}…` : id;
  switch (type) {
    case "members":
      return `Member ${short}`;
    case "projects":
      return `Project ${short}`;
    case "links":
      return `Link ${short}`;
    case "domains":
      return `Domain ${short}`;
  }
}
