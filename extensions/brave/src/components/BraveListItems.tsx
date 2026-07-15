import { BookmarkFolder, HistoryEntry, Tab } from "../interfaces";
import { ReactElement } from "react";
import { getFavicon } from "@raycast/utils";
import { Icon, List } from "@raycast/api";
import { BraveActions } from ".";

export class BraveListItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
  public static BookmarkFolder = BookmarkFolderItem;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getUrlKeywords(url: string): string[] {
  try {
    const parsed = new URL(url);
    // Include hostname parts and pathname parts as keywords
    const hostParts = parsed.hostname.replace("www.", "").split(".");
    const pathParts = parsed.pathname.split("/").filter((p) => p.length > 0);
    return [...hostParts, ...pathParts, parsed.hostname, url];
  } catch {
    return [url];
  }
}
function BookmarkFolderItem({
  profile,
  entry: { name, children, id },
}: {
  entry: BookmarkFolder;
  profile: string;
}): ReactElement {
  const urls = children.filter((c) => c.type === "url").map((c) => c.url);
  return (
    <List.Item
      id={`${profile}-${id}`}
      title={name}
      subtitle={`${urls.length} bookmarks`}
      icon={Icon.Folder}
      actions={<BraveActions.OpenAllBookmarksInFolder urls={urls as string[]} profile={profile} />}
    />
  );
}

function HistoryItem({ profile, entry: { url, title, id } }: { entry: HistoryEntry; profile: string }): ReactElement {
  return (
    <List.Item
      id={`${profile}-${id}`}
      title={title}
      subtitle={url}
      keywords={getUrlKeywords(url)}
      icon={isValidHttpUrl(url) ? getFavicon(url) : Icon.Globe}
      actions={<BraveActions.TabHistory title={title} url={url} profile={profile} />}
    />
  );
}

function TabListItem(props: { tab: Tab; useOriginalFavicon: boolean }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={getUrlKeywords(props.tab.url)}
      actions={<BraveActions.TabList tab={props.tab} />}
      icon={props.useOriginalFavicon ? props.tab.favicon : props.tab.googleFavicon()}
    />
  );
}
