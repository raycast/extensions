import { useMemo } from "react";
import { List, Icon, ActionPanel, Action, Toast, showToast } from "@raycast/api";
import { useLinks } from "./hooks/useLinks";
import { useTranslation } from "./hooks/useTranslation";
import { useConfig } from "./hooks/useConfig";
import { Link, Config } from "./types";
import { queryLink } from "./utils/api";
import { LinkItem } from "./components/LinkItem";
import { useState } from "react";
import { LinkDetail } from "./components/LinkDetail";
import { useNavigation } from "@raycast/api";

export default function LinkListView() {
  const { links, isLoading: isLinksLoading, refreshLinks, cleanCache } = useLinks();
  const { config, isLoading: isConfigLoading } = useConfig();
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const filteredLinks = useMemo(() => {
    if (!searchText) return links;

    const validLinks = links.filter(
      (link): link is Link => link != null && typeof link === "object" && "id" in link && "slug" in link,
    );

    const weighted = validLinks
      .filter((link) => link.slug.toLowerCase().includes(searchText.toLowerCase()))
      .map((link) => {
        const slug = link.slug.toLowerCase();
        const search = searchText.toLowerCase();
        let weight = 0;

        if (slug === search) {
          weight = 3;
        } else if (slug.startsWith(search)) {
          weight = 2;
        } else {
          weight = 1;
        }

        return { link, weight };
      })
      .sort((a, b) => b.weight - a.weight)
      .map(({ link }) => link);

    return weighted;
  }, [links, searchText]);

  async function handleSearch(query: string) {
    const toast = await showToast({ title: t.linkSearching(query), style: Toast.Style.Animated });
    if (!query.trim()) return;
    try {
      const result = await queryLink(query);
      if (result && typeof result === "object" && "slug" in result) {
        toast.style = Toast.Style.Success;
        toast.title = t.linkFound(query);
        const link = result as Link;
        push(<LinkDetail link={link} onRefresh={refreshLinks} />);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = t.linkNotFound;
        toast.message = query;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = t.linkQueryFailed;
      toast.message = String(error);
    }
  }

  if (isLinksLoading || isConfigLoading || !config) {
    return (
      <List>
        <List.EmptyView
          title={t.loadingLinks || "Loading"}
          description={t.loadingLinksDescription || "Your links are on the way"}
          icon={Icon.AirplaneLanding}
        />
      </List>
    );
  }
  const validLinks = links.filter((link): link is Link => link != null && typeof link === "object" && "id" in link);
  const listTitle = searchText
    ? `${t.linkListCount} (${filteredLinks.length})`
    : `${t.linkListCount} (${links.length})`;
  if (validLinks.length === 0) {
    return (
      <List>
        <List.EmptyView
          title={t.noLinks || "No Links"}
          description={t.createLinkDescription || "Create a new short link"}
          icon={Icon.Link}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLinksLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t.searchSlugPlaceholder || "Search links..."}
    >
      {searchText && (
        <List.Item
          icon={Icon.Globe}
          title={t.searchOnline?.(searchText)}
          actions={
            <ActionPanel>
              <Action title={t.search} onAction={() => handleSearch(searchText)} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title={listTitle}>
        {(searchText ? filteredLinks : validLinks).map((link) => (
          <LinkItem
            key={link.id}
            link={link}
            config={config as Config}
            onRefresh={refreshLinks}
            onCleanCache={cleanCache}
          />
        ))}
      </List.Section>
    </List>
  );
}
