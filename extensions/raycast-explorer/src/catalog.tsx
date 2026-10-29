import { Action, Icon, List, environment } from "@raycast/api";
import { Dispatch, SetStateAction, useState } from "react";

import { CONTRIBUTE_URL, getIcon, platformShortcut, raycastProtocol } from "./helpers";

type Category = {
  name: string;
  slug: string;
  icon: string;
};

type CatalogSelection = {
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  selectedCategory: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  toggleSelection: (id: string) => void;
};

export function useCatalogSelection(launchContext?: string[]): CatalogSelection {
  const [selectedIds, setSelectedIds] = useState<string[]>(launchContext ?? []);
  const [selectedCategory, setSelectedCategory] = useState(launchContext ? "selected" : "");

  function toggleSelection(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id]));
  }

  return { selectedIds, setSelectedIds, selectedCategory, setSelectedCategory, toggleSelection };
}

export function CategoryDropdownItems({ categories }: { categories?: Category[] }) {
  return categories?.map((category) => {
    const icon = getIcon(category.icon || "");
    return (
      <List.Dropdown.Item
        key={category.slug}
        title={category.name}
        icon={Icon[icon] ?? Icon.List}
        value={category.slug}
      />
    );
  });
}

export function CatalogDropdown({
  categories,
  selectedCategory,
  onChange,
  selectedItemsTitle,
  isLoading,
}: {
  categories?: Category[];
  selectedCategory: string;
  onChange: (value: string) => void;
  selectedItemsTitle?: string;
  isLoading?: boolean;
}) {
  return (
    <List.Dropdown tooltip="Select Category" onChange={onChange} value={selectedCategory} isLoading={isLoading}>
      <List.Dropdown.Item icon={Icon.BulletPoints} title="All Categories" value="" />
      {selectedItemsTitle ? (
        <List.Dropdown.Item icon={Icon.CheckCircle} title={selectedItemsTitle} value="selected" />
      ) : null}
      <List.Dropdown.Section title="Categories">
        <CategoryDropdownItems categories={categories} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export function ToggleSelectionAction({
  isSelected,
  itemType,
  onToggle,
}: {
  isSelected: boolean;
  itemType: string;
  onToggle: () => void;
}) {
  return (
    <Action
      title={`${isSelected ? "Unselect" : "Select"} ${itemType}`}
      icon={isSelected ? Icon.Circle : Icon.CheckCircle}
      onAction={onToggle}
    />
  );
}

export function AddSelectedToRaycastAction({ target }: { target: string }) {
  return <Action.Open title="Add to Raycast" icon={Icon.RaycastLogoNeg} target={target} />;
}

export function CopyShareUrlAction({ content }: { content: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy URL to Share"
      shortcut={platformShortcut(["cmd", "shift"], "s")}
      icon={Icon.Link}
      content={content}
    />
  );
}

export function CatalogSelectionActions({
  selectedIds,
  setSelectedIds,
  filteredIds,
  selectTitle,
}: {
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  filteredIds: string[];
  selectTitle: string;
}) {
  const hasSelectedItems = selectedIds.length > 0;
  const selectedFilteredItemsCount = selectedIds.filter((id) => filteredIds.includes(id)).length;
  const showSelectAllAction = selectedFilteredItemsCount !== filteredIds.length;

  return (
    <>
      {showSelectAllAction ? (
        <Action
          title={`Select ${selectTitle}`}
          icon={Icon.CheckCircle}
          shortcut={platformShortcut(["cmd", "shift"], "a")}
          onAction={() => setSelectedIds((ids) => [...ids.filter((id) => !filteredIds.includes(id)), ...filteredIds])}
        />
      ) : null}
      {hasSelectedItems ? (
        <Action
          title={`Unselect ${selectTitle}`}
          icon={Icon.Circle}
          shortcut={platformShortcut(["opt", "shift"], "a")}
          onAction={() => setSelectedIds((ids) => ids.filter((id) => !filteredIds.includes(id)))}
        />
      ) : null}
      <Action.OpenInBrowser
        title="Contribute"
        icon={Icon.PlusSquare}
        shortcut={platformShortcut(["cmd", "shift"], "c")}
        url={CONTRIBUTE_URL}
      />
    </>
  );
}

export function buildSharingLink(selectedIds: string[]): string {
  const { extensionName, commandName } = environment;
  const baseLink = `${raycastProtocol}extensions/thomaslombart/${extensionName}/${commandName}`;
  return `${baseLink}?launchContext=${encodeURIComponent(JSON.stringify(selectedIds))}`;
}

export function getSelectedItemIds<TItem extends { id: string }>(groups: TItem[][], selectedIds: string[]): string[] {
  return groups
    .flat()
    .filter((item) => selectedIds.includes(item.id))
    .map((item) => item.id);
}

export function filterCatalogGroups<TGroup extends { slug: string }, TItem extends { id: string }>(
  groups: TGroup[],
  selectedCategory: string,
  selectedIds: string[],
  getItems: (group: TGroup) => TItem[],
  withItems: (group: TGroup, items: TItem[]) => TGroup,
): TGroup[] {
  if (!selectedCategory) return groups;
  if (selectedCategory !== "selected") return groups.filter((group) => group.slug === selectedCategory);

  return groups.map((group) =>
    withItems(
      group,
      getItems(group).filter((item) => selectedIds.includes(item.id)),
    ),
  );
}
