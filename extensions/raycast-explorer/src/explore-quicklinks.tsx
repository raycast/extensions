import { ActionPanel, Action, List, Icon, Color, environment, LaunchProps } from "@raycast/api";
import { getAvatarIcon, useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

import { QuicklinkCategory } from "./data/quicklinks";
import { CONTRIBUTE_URL, getIcon } from "./helpers";

type Props = LaunchProps<{ launchContext: string[] }>;

export default function ExploreSnippets(props: Props) {
  const { data: rawCategories, isLoading } = useFetch<QuicklinkCategory[]>(`https://ray.so/api/quicklinks`);
  const [selectedIds, setSelectedIds] = useState<string[]>(props.launchContext ?? []);
  const [selectedCategory, setSelectedCategory] = useState(props.launchContext ? "selected" : "");

  const categories = useMemo(() => {
    const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
    return rawCategories?.map((category) => {
      return {
        ...category,
        quicklinks: category.quicklinks.map((quicklink) => {
          return {
            ...quicklink,
            link: quicklink.link.replace("raycast://", protocol),
          };
        }),
      };
    });
  }, [rawCategories]);

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  const addToRaycastUrl = useMemo(() => {
    const quicklinks = categories
      ?.flatMap((category) => category.quicklinks)
      .filter((quicklink) => selectedIds.includes(quicklink.id));

    const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";

    const queryString = quicklinks
      ?.map((quicklink) => {
        const { name, link, openWith, icon } = quicklink;

        return `quicklinks=${encodeURIComponent(JSON.stringify({ name, link, openWith, iconName: icon?.name ? `${icon.name}-16` : undefined }))}`;
      })
      .join("&");

    return `${protocol}quicklinks/import?${queryString}`;
  }, [selectedIds, categories]);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === "") {
      return categories;
    }

    if (selectedCategory === "selected") {
      return categories?.map((category) => {
        return {
          ...category,
          quicklinks: category.quicklinks.filter((quicklink) => selectedIds.includes(quicklink.id)),
        };
      });
    }

    return categories?.filter((category) => category.slug === selectedCategory);
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
  const selectedFilteredQuicklinksCount = selectedIds.filter((id) => filteredQuicklinkIds.includes(id)).length;
  const showSelectAllQuicklinksAction = selectedFilteredQuicklinksCount !== filteredQuicklinkIds.length;
  const hasSelectedQuicklinks = selectedIds.length > 0;

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, category, or link"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          onChange={setSelectedCategory}
          value={selectedCategory}
          isLoading={isLoading}
        >
          <List.Dropdown.Item icon={Icon.BulletPoints} title="All Categories" value="" />
          {hasSelectedQuicklinks ? (
            <List.Dropdown.Item icon={Icon.CheckCircle} title="Selected Quicklinks" value="selected" />
          ) : null}

          <List.Dropdown.Section title="Categories">
            {categories?.map((category) => {
              const icon = getIcon(category.icon || "");
              return (
                <List.Dropdown.Item
                  icon={Icon[icon] ?? Icon.List}
                  key={category.slug}
                  title={category.name}
                  value={category.slug}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
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
                          ? `${quicklink?.icon?.name}-16` || "link"
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
                    {isSelected ? (
                      <Action
                        title="Unselect Quicklink"
                        icon={Icon.Circle}
                        onAction={() => toggleSelect(quicklink.id)}
                      />
                    ) : (
                      <Action
                        title="Select Quicklink"
                        icon={Icon.CheckCircle}
                        onAction={() => toggleSelect(quicklink.id)}
                      />
                    )}

                    {hasSelectedQuicklinks ? (
                      <Action.Open title="Add to Raycast" icon={Icon.RaycastLogoNeg} target={addToRaycastUrl} />
                    ) : null}

                    <ActionPanel.Section>
                      {showSelectAllQuicklinksAction ? (
                        <Action
                          title={`Select ${selectQuicklinksTitle}`}
                          icon={Icon.CheckCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                          onAction={() =>
                            setSelectedIds((ids) => [
                              ...ids.filter((id) => !filteredQuicklinkIds.includes(id)),
                              ...filteredQuicklinkIds,
                            ])
                          }
                        />
                      ) : null}
                      {hasSelectedQuicklinks ? (
                        <Action
                          title={`Unselect ${selectQuicklinksTitle}`}
                          icon={Icon.Circle}
                          shortcut={{ modifiers: ["opt", "shift"], key: "a" }}
                          onAction={() => {
                            setSelectedIds(selectedIds.filter((id) => !filteredQuicklinkIds.includes(id)));
                          }}
                        />
                      ) : null}
                      <Action.OpenInBrowser
                        title="Contribute"
                        icon={Icon.PlusSquare}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        url={CONTRIBUTE_URL}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Quicklink Link"
                        shortcut={{ modifiers: ["cmd"], key: "." }}
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
