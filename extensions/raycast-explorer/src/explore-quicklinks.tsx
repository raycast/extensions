import { ActionPanel, Action, List, Icon, Color, LaunchProps } from "@raycast/api";
import { getAvatarIcon, useFetch } from "@raycast/utils";
import { useMemo } from "react";

import {
  AddSelectedToRaycastAction,
  CatalogDropdown,
  CatalogSelectionActions,
  filterCatalogGroups,
  ToggleSelectionAction,
  useCatalogSelection,
} from "./catalog";
import { QuicklinkCategory } from "./data/quicklinks";
import { platformShortcut } from "./helpers";

type Props = LaunchProps<{ launchContext: string[] }>;

export default function ExploreSnippets(props: Props) {
  const { data: rawCategories, isLoading } = useFetch<QuicklinkCategory[]>(`https://ray.so/api/quicklinks`);
  const { selectedIds, setSelectedIds, selectedCategory, setSelectedCategory, toggleSelection } = useCatalogSelection(
    props.launchContext,
  );

  const categories = useMemo(() => {
    const protocol = `${process.env.RAYCAST_SCHEME ?? "raycast"}://`;
    // External quicklink data from ray.so always uses the public "raycast://" prefix.
    // Rewrite it to the current build's scheme (supports internal/alpha/dev builds).
    const publicRaycastPrefix = "raycast://";
    return rawCategories?.map((category) => {
      return {
        ...category,
        quicklinks: category.quicklinks.map((quicklink) => {
          return {
            ...quicklink,
            link: quicklink.link.replace(publicRaycastPrefix, protocol),
          };
        }),
      };
    });
  }, [rawCategories]);

  const addToRaycastUrl = useMemo(() => {
    const quicklinks = categories
      ?.flatMap((category) => category.quicklinks)
      .filter((quicklink) => selectedIds.includes(quicklink.id));

    const protocol = `${process.env.RAYCAST_SCHEME ?? "raycast"}://`;

    const queryString = quicklinks
      ?.map((quicklink) => {
        const { name, link, openWith, icon } = quicklink;

        return `quicklinks=${encodeURIComponent(JSON.stringify({ name, link, openWith, iconName: icon?.name ? `${icon.name}-16` : undefined }))}`;
      })
      .join("&");

    return `${protocol}quicklinks/import?${queryString}`;
  }, [selectedIds, categories]);

  const filteredCategories = useMemo(() => {
    if (!categories) return categories;
    return filterCatalogGroups(
      categories,
      selectedCategory,
      selectedIds,
      (category) => category.quicklinks,
      (category, quicklinks) => ({ ...category, quicklinks }),
    );
  }, [selectedCategory, categories, selectedIds]);

  const selectQuicklinksTitle = useMemo(() => {
    const category = categories?.find((category) => category.slug === selectedCategory);
    if (category) {
      return `All ${category.name} Quicklinks`;
    }

    return "All Quicklinks";
  }, [selectedCategory, categories]);

  const filteredQuicklinkIds =
    filteredCategories?.flatMap((category) => category.quicklinks).map((quicklink) => quicklink.id) ?? [];
  const hasSelectedQuicklinks = selectedIds.length > 0;

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, category, or link"
      searchBarAccessory={
        <CatalogDropdown
          categories={categories}
          selectedCategory={selectedCategory}
          onChange={setSelectedCategory}
          isLoading={isLoading}
          selectedItemsTitle={hasSelectedQuicklinks ? "Selected Quicklinks" : undefined}
        />
      }
    >
      {filteredCategories?.map((category) => (
        <List.Section key={category.name} title={category.name}>
          {category.quicklinks.map((quicklink) => {
            const isSelected = selectedIds.includes(quicklink.id);
            let domain = "";
            if (quicklink?.icon?.link || quicklink.link.startsWith("https")) {
              const url = new URL(quicklink?.icon?.link || quicklink.link);
              domain = url.hostname.replace("www.", "");
            }

            const useRaycastIcon = !quicklink.link.startsWith("http") && !quicklink?.icon?.link?.startsWith("http");

            return (
              <List.Item
                key={quicklink.id}
                title={quicklink.name}
                icon={
                  isSelected
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : {
                        source: useRaycastIcon
                          ? quicklink?.icon?.name
                            ? `${quicklink.icon.name}-16`
                            : "link"
                          : `https://api.ray.so/favicon?url=%5C${domain}&size=64`,
                      }
                }
                keywords={[category.name, quicklink.description ?? "", quicklink.link]}
                detail={
                  <List.Item.Detail
                    markdown={`${quicklink.link}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        {quicklink.description && (
                          <List.Item.Detail.Metadata.Label title="Description" text={quicklink.description} />
                        )}
                        {quicklink.openWith && (
                          <List.Item.Detail.Metadata.Label title="Open With" text={quicklink.openWith} />
                        )}
                        {quicklink.author && (
                          <List.Item.Detail.Metadata.Label
                            title="Author"
                            text={quicklink.author.name}
                            icon={getAvatarIcon(quicklink.author.name)}
                          />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ToggleSelectionAction
                      isSelected={isSelected}
                      itemType="Quicklink"
                      onToggle={() => toggleSelection(quicklink.id)}
                    />

                    {hasSelectedQuicklinks ? <AddSelectedToRaycastAction target={addToRaycastUrl} /> : null}

                    <ActionPanel.Section>
                      <CatalogSelectionActions
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                        filteredIds={filteredQuicklinkIds}
                        selectTitle={selectQuicklinksTitle}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Quicklink Link"
                        shortcut={platformShortcut(["cmd"], ".")}
                        content={quicklink.link}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
