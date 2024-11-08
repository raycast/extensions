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
  const { t } = useTranslation();
  const { config, isLoading: isConfigLoading } = useConfig();
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
    if (!query.trim()) return;
    try {
      const result = await queryLink(query);
      if (result && typeof result === "object" && "slug" in result) {
        const link = result as Link;
        push(<LinkDetail link={link} onRefresh={refreshLinks} />);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: t.linkNotFound,
          message: query,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.linkQueryFailed,
        message: String(error),
      });
    }
  }

  if (isLinksLoading || isConfigLoading || !config) {
    <List.EmptyView
      title={t.loadingLinks || "Loading"}
      description={t.loadingLinksDescription || "Your links are on the way"}
      icon={Icon.AirplaneLanding}
    />;
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
