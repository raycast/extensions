import { List, LocalStorage, Icon } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { useLinks } from "./hooks/useLinks";
import { LinkItem } from "./components/LinkItem";
import { searchLinks } from "./services/search";
import { sortLinks, getSortLabel, isValidSortOption } from "./services/sort";
import { filterLinks, getFilterLabel } from "./services/filter";
import { cleanupPinnedSlugs, pinLink, unpinLink, movePinnedLink } from "./services/pin";
import type { SortOption, FilterOption, Link } from "./types";

interface LaunchProps {
  launchContext?: {
    searchText?: string;
  };
}

export default function Command(props: LaunchProps) {
  const { data: links, isLoading, revalidate } = useLinks();
  const [keyword, setKeyword] = useState(props.launchContext?.searchText || "");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");
  const [isLoadingSort, setIsLoadingSort] = useState(true);
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [pinnedSlugs, setPinnedSlugs] = useState<string[]>([]);
  const [isLoadingPinned, setIsLoadingPinned] = useState(true);

  // Load saved sort preference
  useEffect(() => {
    LocalStorage.getItem<string>("link-sort-preference").then((stored) => {
      if (stored && isValidSortOption(stored)) {
        setSortBy(stored as SortOption);
      }
      setIsLoadingSort(false);
    });
  }, []);

  // Load and cleanup pinned slugs
  useEffect(() => {
    if (!links) return;

    const loadPinned = async () => {
      const existingSlugs = links.map((link) => link.short_code);
      const validPinned = await cleanupPinnedSlugs(existingSlugs);
      setPinnedSlugs(validPinned);
      setIsLoadingPinned(false);
    };

    loadPinned();
  }, [links]);

  // Save sort preference
  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    await LocalStorage.setItem("link-sort-preference", newSort);
  };

  // Pin handlers
  const handlePin = async (slug: string) => {
    await pinLink(slug);
    setPinnedSlugs([...pinnedSlugs, slug]);
  };

  const handleUnpin = async (slug: string) => {
    await unpinLink(slug);
    setPinnedSlugs(pinnedSlugs.filter((s) => s !== slug));
  };

  const handleMoveUp = async (slug: string) => {
    const success = await movePinnedLink(slug, "up");
    if (success) {
      const index = pinnedSlugs.indexOf(slug);
      const newPinned = [...pinnedSlugs];
      [newPinned[index], newPinned[index - 1]] = [newPinned[index - 1], newPinned[index]];
      setPinnedSlugs(newPinned);
    }
  };

  const handleMoveDown = async (slug: string) => {
    const success = await movePinnedLink(slug, "down");
    if (success) {
      const index = pinnedSlugs.indexOf(slug);
      const newPinned = [...pinnedSlugs];
      [newPinned[index], newPinned[index + 1]] = [newPinned[index + 1], newPinned[index]];
      setPinnedSlugs(newPinned);
    }
  };

  // Data processing pipeline
  const { pinnedLinks, unpinnedLinks } = useMemo(() => {
    if (!links) return { pinnedLinks: [], unpinnedLinks: [] };

    // Separate pinned and unpinned
    const pinned: Link[] = [];
    const unpinned: Link[] = [];

    // Maintain pinned order
    for (const slug of pinnedSlugs) {
      const link = links.find((l) => l.short_code === slug);
      if (link) pinned.push(link);
    }

    // Collect unpinned
    for (const link of links) {
      if (!pinnedSlugs.includes(link.short_code)) {
        unpinned.push(link);
      }
    }

    // Process unpinned: filter → sort
    const filteredUnpinned = filterLinks(unpinned, filterBy);
    const sortedUnpinned = sortLinks(filteredUnpinned, sortBy);

    return {
      pinnedLinks: pinned,
      unpinnedLinks: sortedUnpinned,
    };
  }, [links, pinnedSlugs, filterBy, sortBy]);

  // Apply search to all links
  const searchedPinned = searchLinks(pinnedLinks, keyword);
  const searchedUnpinned = searchLinks(unpinnedLinks, keyword);

  return (
    <List
      navigationTitle={!isLoadingSort ? `Links - ${getFilterLabel(filterBy)} - ${getSortLabel(sortBy)}` : "Links"}
      searchBarPlaceholder="Search by Slug, URL or Description"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Links"
          storeValue={true}
          onChange={(newValue) => setFilterBy(newValue as FilterOption)}
        >
          <List.Dropdown.Item title="All Links" value="all" icon={Icon.Circle} />
          <List.Dropdown.Item title="Active Links" value="active" icon={Icon.CheckCircle} />
          <List.Dropdown.Item title="Disabled Links" value="disabled" icon={Icon.XMarkCircle} />
        </List.Dropdown>
      }
      isLoading={isLoading || isLoadingSort || isLoadingPinned}
      onSearchTextChange={setKeyword}
      searchText={keyword}
      filtering={false} // Disable Raycast's built-in filtering
      throttle // Optimize performance with throttling
    >
      {searchedPinned.length > 0 && (
        <List.Section title={`Pinned Links (${searchedPinned.length})`}>
          {searchedPinned.map((link, index) => (
            <LinkItem
              key={link.short_code}
              link={link}
              onRefresh={revalidate}
              currentSort={sortBy}
              onSortChange={handleSortChange}
              isPinned={true}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onMoveUp={index > 0 ? () => handleMoveUp(link.short_code) : undefined}
              onMoveDown={index < pinnedLinks.length - 1 ? () => handleMoveDown(link.short_code) : undefined}
            />
          ))}
        </List.Section>
      )}

      <List.Section
        title={`${getFilterLabel(filterBy)} Links (${searchedUnpinned.length})`}
        subtitle={!isLoadingSort ? getSortLabel(sortBy) : undefined}
      >
        {searchedUnpinned.map((link) => (
          <LinkItem
            key={link.short_code}
            link={link}
            onRefresh={revalidate}
            currentSort={sortBy}
            onSortChange={handleSortChange}
            isPinned={false}
            onPin={handlePin}
            onUnpin={handleUnpin}
          />
        ))}
      </List.Section>
    </List>
  );
}
