import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import getHomepageIcon from "./utils/getHomepageIcon";

interface Preferences {
  homepageUrl: string;
}

interface Bookmark {
  name: string;
  icon?: string;
  abbr?: string;
  href: string;
}

interface BookmarkGroup {
  name: string;
  icon?: string;
  bookmarks: Bookmark[];
}

const preferences = getPreferenceValues<Preferences>();
const apiUrl = `${preferences.homepageUrl}/api`;

export default function Command() {
  const { data, isLoading } = useFetch(`${apiUrl}/bookmarks`) as { data: BookmarkGroup[]; isLoading: boolean };
  return (
    <List isLoading={isLoading}>
      {data?.map((group: BookmarkGroup) => {
        const { name, bookmarks } = group;

        return (
          <List.Section key={name} title={name} subtitle={bookmarks.length.toString()}>
            {group.bookmarks.map((bookmark: Bookmark) => {
              const { name, icon, abbr, href } = bookmark;

              return (
                <List.Item
                  key={name}
                  id={name}
                  icon={icon ? getHomepageIcon(icon) : getFavicon(href)}
                  title={name}
                  accessories={abbr ? [{ tag: abbr }] : undefined}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title={`Open ${name}`} url={href} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
