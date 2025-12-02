/**
 * Recent Links Command
 * View the most recently saved links
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
import { useMemo } from "react";
import { useAllLinks, useUniverses } from "./hooks/useLinks";
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

export default function RecentLinksCommand() {
  const prefs = getPreferenceValues<KalpaPreferences>();
  const { data: links, isLoading, revalidate } = useAllLinks({ numItems: 25 });
  const { data: universes } = useUniverses();

  // Check if API token is configured
  if (!prefs.apiToken) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="Login Required"
          description="Connect your Kalpa account to view recent links"
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

  // Group by time period
  const { today, yesterday, thisWeek, older } = useMemo(() => {
    const now = Date.now();
    const todayLinks: KalpaLink[] = [];
    const yesterdayLinks: KalpaLink[] = [];
    const thisWeekLinks: KalpaLink[] = [];
    const olderLinks: KalpaLink[] = [];

    links?.forEach((link: KalpaLink) => {
      const age = now - link._creationTime;
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;

      if (age < oneDay) {
        todayLinks.push(link);
      } else if (age < 2 * oneDay) {
        yesterdayLinks.push(link);
      } else if (age < oneWeek) {
        thisWeekLinks.push(link);
      } else {
        olderLinks.push(link);
      }
    });

    return { today: todayLinks, yesterday: yesterdayLinks, thisWeek: thisWeekLinks, older: olderLinks };
  }, [links]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent links...">
      {links?.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Clock} title="No Recent Links" description="Save some links to see them here" />
      ) : (
        <>
          {today.length > 0 && (
            <List.Section title="Today" subtitle={`${today.length} links`}>
              {today.map((link) => (
                <RecentLinkItem key={link._id} link={link} universes={universes} onRefresh={revalidate} />
              ))}
            </List.Section>
          )}

          {yesterday.length > 0 && (
            <List.Section title="Yesterday" subtitle={`${yesterday.length} links`}>
              {yesterday.map((link) => (
                <RecentLinkItem key={link._id} link={link} universes={universes} onRefresh={revalidate} />
              ))}
            </List.Section>
          )}

          {thisWeek.length > 0 && (
            <List.Section title="This Week" subtitle={`${thisWeek.length} links`}>
              {thisWeek.map((link) => (
                <RecentLinkItem key={link._id} link={link} universes={universes} onRefresh={revalidate} />
              ))}
            </List.Section>
          )}

          {older.length > 0 && (
            <List.Section title="Older" subtitle={`${older.length} links`}>
              {older.map((link) => (
                <RecentLinkItem key={link._id} link={link} universes={universes} onRefresh={revalidate} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface RecentLinkItemProps {
  link: KalpaLink;
  universes?: KalpaUniverse[];
  onRefresh: () => void;
}

function RecentLinkItem({ link, universes, onRefresh }: RecentLinkItemProps) {
  const client = getKalpaClient();

  const accessories: List.Item.Accessory[] = [];

  // Show link type
  if (link.linkType === "youtube") {
    accessories.push({ tag: { value: "Video", color: Color.Red } });
  } else if (link.linkType === "codepen") {
    accessories.push({ tag: { value: "CodePen", color: Color.Blue } });
  }

  // Show universe if assigned
  if (link.universes && link.universes.length > 0) {
    accessories.push({
      tag: { value: link.universes[0].name, color: Color.Purple },
    });
  }

  // Show read status
  if (link.is_read) {
    accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green } });
  }

  // Show time
  accessories.push({ text: formatRelativeTime(link._creationTime) });

  return (
    <List.Item
      id={link._id}
      title={truncate(link.title, 55)}
      subtitle={formatDomain(link.domain)}
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
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
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
                    title: "Failed",
                    message: String(error),
                  });
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy URL" content={link.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard title="Copy Title" content={link.title} />
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
                        title: "Failed",
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
