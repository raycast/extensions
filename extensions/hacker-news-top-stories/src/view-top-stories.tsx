import { useEffect, useState, useMemo } from "react";
import {
  Icon,
  MenuBarExtra,
  open,
  getPreferenceValues,
  Keyboard,
  Color,
  openExtensionPreferences,
  environment,
} from "@raycast/api";
import { Story } from "./types";
import { getFavicon } from "@raycast/utils";
import { showNotification } from "./lib/show-notification";
import {
  getNotifiedStories,
  getPointsFromContent,
  getReadStories,
  getRecentStories,
  markStoriesRead,
  refreshStories,
  resetIfPointsChanged,
  saveNotifiedStories,
} from "./lib/stories";

function getShortcut(index: number) {
  const key = index + 1;
  return key >= 1 && key <= 9
    ? { modifiers: ["cmd"] as Keyboard.KeyModifier[], key: String(key) as Keyboard.KeyEquivalent }
    : undefined;
}

export default function Command() {
  const { points, enableNotifications, useStoryIcon } = getPreferenceValues<Preferences>();
  resetIfPointsChanged(points);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Starting empty shows no stories and the all-read icon until the fetch finishes
  const [stories, setStories] = useState<Story[]>(() => getRecentStories());

  // Memoize cache reads and parse operations
  const readStories = useMemo(() => getReadStories(), []);

  // Memoize unread count calculation
  const unreadCount = useMemo(
    () => stories.filter((story) => !readStories.has(story.external_url)).length,
    [stories, readStories],
  );

  // Memoize icon configuration
  const iconConfig = useMemo(
    () => ({
      source: unreadCount > 0 ? "icon.png" : "icon-64-dark.png",
      tintColor: unreadCount > 0 ? null : Color.PrimaryText,
    }),
    [unreadCount],
  );

  // Memoize tooltip
  const tooltip = useMemo(
    () => `Hacker News ${points}+ Stories${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
    [unreadCount, points],
  );

  useEffect(() => {
    setError(null);
    setLoading(true);
    refreshStories(points)
      .then(async ({ recent, unseen, isFirstLoad }) => {
        const latest = unseen[0];
        const notifiedStories = getNotifiedStories();
        if (enableNotifications && !isFirstLoad && latest && !notifiedStories.has(latest.external_url)) {
          // Only ever notify about a story once
          notifiedStories.add(latest.external_url);
          saveNotifiedStories(notifiedStories);
          const icon = useStoryIcon ? await getFavicon(latest.url) : `${environment.assetsPath}/icon-128.png`;
          await showNotification({
            title: "Hacker News Top Stories",
            message: latest.title,
            icon,
            url: latest.external_url,
          });
        }
        return recent;
      })
      .then((stories) => setStories(stories))
      .catch((error) => setError(`Error: ${error.message}`))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MenuBarExtra icon={iconConfig} tooltip={tooltip} isLoading={loading}>
      <MenuBarExtra.Section title={tooltip}>
        <MenuItems error={error} stories={stories} setStories={setStories} readStories={readStories} points={points} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {stories.length > 0 ? (
          <MenuBarExtra.Item
            title="Mark All As Read"
            icon={Icon.Checkmark}
            onAction={() => {
              stories.forEach(({ external_url }) => {
                readStories.add(external_url);
              });
              markStoriesRead(stories.map(({ external_url }) => external_url));
              // force update the icon
              setStories((prev) => [...prev]);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        ) : null}
        <MenuBarExtra.Item
          title="Open Preferences"
          onAction={openExtensionPreferences}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          icon={Icon.Gear}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

type MenuItemsProps = {
  error: string | null;
  stories: Story[];
  setStories: React.Dispatch<React.SetStateAction<Story[]>>;
  readStories: Set<string>;
  points: string;
};

const MenuItems = ({ error, stories, setStories, readStories, points }: MenuItemsProps) => {
  if (error) return <MenuBarExtra.Item title={error} />;
  if (stories.length === 0) return <MenuBarExtra.Item title={`No recent stories with ${points}+ points`} />;

  return stories?.map((story: Story, index: number) => (
    <MenuBarExtra.Item
      key={story.external_url}
      icon={{
        source: Icon.Dot,
        tintColor: readStories.has(story.external_url) ? { light: "#787794", dark: "gray" } : "#E96E37",
      }}
      title={story.title.length > 50 ? `${story.title.slice(0, 50)}...` : story.title}
      subtitle={
        getPointsFromContent(story.content_html) ? `${getPointsFromContent(story.content_html)} Points` : undefined
      }
      tooltip={`${readStories.has(story.external_url) ? "" : "(unread) "}${story.title}`}
      shortcut={getShortcut(index)}
      onAction={() => {
        readStories.add(story.external_url);
        markStoriesRead([story.external_url]);
        // force update the icon
        setStories((prev) => [...prev]);
        open(story.external_url);
      }}
    />
  ));
};
