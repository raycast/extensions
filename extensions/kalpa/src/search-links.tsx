/**
 * Search Links Command
 * The primary command for searching and opening saved links in Kalpa
 */

import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  Color,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { useAllLinks, useUniverses } from "./hooks/useLinks";
import { getKalpaClient } from "./utils/kalpa-client";
import {
  getLinkIcon,
  getLinkIconColor,
  formatDomain,
  formatRelativeTime,
  truncate,
  matchesSearch,
  sortByRelevance,
  getUniverseIcon,
} from "./utils/helpers";
import type { KalpaLink, KalpaPreferences, KalpaUniverse } from "./types";

export default function SearchLinksCommand() {
  const [searchText, setSearchText] = useState("");
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null);
  const [selectedTag] = useState<string | null>(null);
  const [showArchived] = useState(false);

  const prefs = getPreferenceValues<KalpaPreferences>();

  // Fetch data
  const {
    data: allLinks,
    isLoading: linksLoading,
    revalidate: revalidateLinks,
  } = useAllLinks({
    universeId: selectedUniverse || undefined,
    tagId: selectedTag || undefined,
    hideArchived: !showArchived,
    numItems: 100,
  });

  const { data: universes, isLoading: universesLoading } = useUniverses();

  // Filter and sort links based on search
  const filteredLinks = useMemo(() => {
    if (!allLinks) return [];

    const base = searchText ? allLinks.filter((link: KalpaLink) => matchesSearch(link, searchText)) : allLinks;

    return sortByRelevance(base, searchText);
  }, [allLinks, searchText]);

  // Group links by type for sections
  const groupedLinks = useMemo(() => {
    const groups: Record<string, KalpaLink[]> = {
      articles: [],
      videos: [],
      codepens: [],
    };

    filteredLinks.forEach((link) => {
      if (link.linkType === "youtube" || link.url.includes("youtube.com") || link.url.includes("youtu.be")) {
        groups.videos.push(link);
      } else if (link.linkType === "codepen" || link.url.includes("codepen.io")) {
        groups.codepens.push(link);
      } else {
        groups.articles.push(link);
      }
    });

    return groups;
  }, [filteredLinks]);

  const isLoading = linksLoading || universesLoading;

  // Check if API token is configured
  if (!prefs.apiToken) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="Login Required"
          description="Connect your Kalpa account to search your saved links"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Login to Kalpa" url="https://usekalpa.com/raycast" icon={Icon.Link} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your saved links..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Universe"
          value={selectedUniverse || "all"}
          onChange={(value) => setSelectedUniverse(value === "all" ? null : value)}
        >
          <List.Dropdown.Item title="All Universes" value="all" icon={Icon.Globe} />
          <List.Dropdown.Section title="Universes">
            {universes?.map((universe: KalpaUniverse) => (
              <List.Dropdown.Item
                key={universe._id}
                title={`${universe.name} (${universe.linkCount || 0})`}
                value={universe._id}
                icon={getUniverseIcon(universe)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredLinks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Links Found"
          description={searchText ? `No results for "${searchText}"` : "Save some links to get started"}
        />
      ) : (
        <>
          {/* Articles Section */}
          {groupedLinks.articles.length > 0 && (
            <List.Section title="Articles" subtitle={`${groupedLinks.articles.length} links`}>
              {groupedLinks.articles.map((link) => (
                <LinkListItem key={link._id} link={link} universes={universes} onRefresh={revalidateLinks} />
              ))}
            </List.Section>
          )}

          {/* Videos Section */}
          {groupedLinks.videos.length > 0 && (
            <List.Section title="Videos" subtitle={`${groupedLinks.videos.length} videos`}>
              {groupedLinks.videos.map((link) => (
                <LinkListItem key={link._id} link={link} universes={universes} onRefresh={revalidateLinks} />
              ))}
            </List.Section>
          )}

          {/* CodePens Section */}
          {groupedLinks.codepens.length > 0 && (
            <List.Section title="CodePens" subtitle={`${groupedLinks.codepens.length} pens`}>
              {groupedLinks.codepens.map((link) => (
                <LinkListItem key={link._id} link={link} universes={universes} onRefresh={revalidateLinks} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface LinkListItemProps {
  link: KalpaLink;
  universes?: KalpaUniverse[];
  onRefresh: () => void;
}

function LinkListItem({ link, universes, onRefresh }: LinkListItemProps) {
  const client = getKalpaClient();

  const accessories: List.Item.Accessory[] = [];

  // Add universe tags
  if (link.universes && link.universes.length > 0) {
    link.universes.slice(0, 2).forEach((universe) => {
      accessories.push({
        tag: { value: universe.name, color: Color.Purple },
      });
    });
  }

  // Add read status
  if (link.is_read) {
    accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Read" });
  }

  // Add archived status
  if (link.is_archived) {
    accessories.push({ icon: { source: Icon.Tray, tintColor: Color.SecondaryText }, tooltip: "Archived" });
  }

  // Add time
  accessories.push({ text: formatRelativeTime(link._creationTime) });

  // Get subtitle
  const subtitle = link.summary_preview ? truncate(link.summary_preview, 60) : formatDomain(link.domain);

  // Get icon
  const icon = {
    source: getLinkIcon(link),
    tintColor: getLinkIconColor(link),
  };

  return (
    <List.Item
      id={link._id}
      title={truncate(link.title, 60)}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      keywords={[link.domain, link.linkType || "", ...(link.tags?.map((t) => t.name) || [])]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser title="Open in Browser" url={link.url} icon={Icon.Globe} />
            <Action.OpenInBrowser
              title="Open in Kalpa"
              url={client.getLinkWebUrl(link._id)}
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Actions">
            <Action
              title={link.is_read ? "Mark as Unread" : "Mark as Read"}
              icon={link.is_read ? Icon.Circle : Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                try {
                  await client.toggleRead(link._id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: link.is_read ? "Marked as unread" : "Marked as read",
                  });
                  onRefresh();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to update",
                    message: String(error),
                  });
                }
              }}
            />
            <Action
              title={link.is_archived ? "Unarchive" : "Archive"}
              icon={link.is_archived ? Icon.Tray : Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={async () => {
                try {
                  await client.toggleArchive(link._id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: link.is_archived ? "Unarchived" : "Archived",
                  });
                  onRefresh();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to update",
                    message: String(error),
                  });
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy URL" content={link.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard
              title="Copy Title"
              content={link.title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {link.summary_preview && <Action.CopyToClipboard title="Copy Summary" content={link.summary_preview} />}
          </ActionPanel.Section>

          <ActionPanel.Section title="Universe">
            {universes?.map((universe) => {
              const isAssigned = link.universes?.some((u) => u._id === universe._id);
              return (
                <Action
                  key={universe._id}
                  title={isAssigned ? `Remove from ${universe.name}` : `Add to ${universe.name}`}
                  icon={getUniverseIcon(universe)}
                  onAction={async () => {
                    try {
                      if (isAssigned) {
                        await client.removeFromUniverse(link._id, universe._id);
                      } else {
                        await client.assignToUniverse(link._id, universe._id);
                      }
                      await showToast({
                        style: Toast.Style.Success,
                        title: isAssigned ? `Removed from ${universe.name}` : `Added to ${universe.name}`,
                      });
                      onRefresh();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to update",
                        message: String(error),
                      });
                    }
                  }}
                />
              );
            })}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
