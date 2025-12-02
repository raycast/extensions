/**
 * Browse Universes Command
 * Browse links organized by universe (collection)
 */

import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Color,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { useUniverses, useAllLinks } from "./hooks/useLinks";
import { getKalpaClient } from "./utils/kalpa-client";
import type { KalpaPreferences } from "./types";
import {
  getLinkIcon,
  getLinkIconColor,
  formatDomain,
  formatRelativeTime,
  truncate,
  getUniverseIcon,
} from "./utils/helpers";
import type { KalpaLink, KalpaUniverse } from "./types";

export default function BrowseUniversesCommand() {
  const prefs = getPreferenceValues<KalpaPreferences>();
  const [selectedUniverse, setSelectedUniverse] = useState<KalpaUniverse | null>(null);

  const { data: universes, isLoading: universesLoading, revalidate: revalidateUniverses } = useUniverses();

  // Check if API token is configured
  if (!prefs.apiToken) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="Login Required"
          description="Connect your Kalpa account to browse universes"
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

  if (selectedUniverse) {
    return (
      <UniverseLinksView
        universe={selectedUniverse}
        onBack={() => setSelectedUniverse(null)}
        onRefresh={revalidateUniverses}
      />
    );
  }

  return (
    <List isLoading={universesLoading} searchBarPlaceholder="Search universes...">
      {universes?.length === 0 && !universesLoading ? (
        <List.EmptyView
          icon={Icon.Circle}
          title="No Universes"
          description="Create universes in the Kalpa app to organize your links"
        />
      ) : (
        <List.Section title="Your Universes" subtitle={`${universes?.length || 0} universes`}>
          {universes?.map((universe: KalpaUniverse) => (
            <UniverseListItem key={universe._id} universe={universe} onSelect={() => setSelectedUniverse(universe)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface UniverseListItemProps {
  universe: KalpaUniverse;
  onSelect: () => void;
}

function UniverseListItem({ universe, onSelect }: UniverseListItemProps) {
  const client = getKalpaClient();

  return (
    <List.Item
      id={universe._id}
      title={universe.name}
      subtitle={`${universe.linkCount || 0} links`}
      icon={getUniverseIcon(universe)}
      accessories={[{ text: formatRelativeTime(universe._creationTime) }]}
      actions={
        <ActionPanel>
          <Action title="View Links" icon={Icon.List} onAction={onSelect} />
          <Action.OpenInBrowser
            title="Open in Kalpa"
            url={client.getUniverseWebUrl(universe._id)}
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Universe Name"
            content={universe.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface UniverseLinksViewProps {
  universe: KalpaUniverse;
  onBack: () => void;
  onRefresh: () => void;
}

function UniverseLinksView({ universe, onBack, onRefresh }: UniverseLinksViewProps) {
  const [searchText, setSearchText] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const client = getKalpaClient();

  const {
    data: links,
    isLoading,
    revalidate,
  } = useAllLinks({
    universeId: universe._id,
    numItems: 100,
  });

  // Filter by search
  const filteredLinks = links?.filter((link: KalpaLink) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    return (
      link.title.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query) ||
      link.domain.toLowerCase().includes(query)
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search in ${universe.name}...`}
      navigationTitle={universe.name}
    >
      {filteredLinks?.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={getUniverseIcon(universe)}
          title="No Links"
          description={searchText ? `No results for "${searchText}"` : "This universe is empty"}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={universe.name} subtitle={`${filteredLinks?.length || 0} links`}>
          {filteredLinks?.map((link: KalpaLink) => (
            <UniverseLinkItem
              key={link._id}
              link={link}
              universe={universe}
              onRefresh={() => {
                revalidate();
                onRefresh();
              }}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface UniverseLinkItemProps {
  link: KalpaLink;
  universe: KalpaUniverse;
  onRefresh: () => void;
}

function UniverseLinkItem({ link, universe, onRefresh }: UniverseLinkItemProps) {
  const client = getKalpaClient();

  const accessories: List.Item.Accessory[] = [];

  if (link.is_read) {
    accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Read" });
  }

  accessories.push({ text: formatRelativeTime(link._creationTime) });

  const subtitle = link.summary_preview ? truncate(link.summary_preview, 60) : formatDomain(link.domain);

  return (
    <List.Item
      id={link._id}
      title={truncate(link.title, 60)}
      subtitle={subtitle}
      icon={{
        source: getLinkIcon(link),
        tintColor: getLinkIconColor(link),
      }}
      accessories={accessories}
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
                  await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
                }
              }}
            />
            <Action
              title="Remove from Universe"
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                try {
                  await client.removeFromUniverse(link._id, universe._id);
                  await showToast({ style: Toast.Style.Success, title: `Removed from ${universe.name}` });
                  onRefresh();
                } catch (error) {
                  await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy URL" content={link.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard title="Copy Title" content={link.title} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
