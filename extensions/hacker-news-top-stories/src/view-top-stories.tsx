import { useEffect, useState, useMemo } from "react";
import {
  Cache,
  Icon,
  MenuBarExtra,
  open,
  getPreferenceValues,
  Keyboard,
  Color,
  openExtensionPreferences,
  environment,
} from "@raycast/api";
import { getStories } from "./hackernews";
import { Story } from "./types";
import { getFavicon } from "@raycast/utils";
import { showNotification } from "./lib/show-notification";

const cache = new Cache();
// Stories that the user clicked on
const readKey = "read-stories";
// Stories we've sent a notification about
const notifiedKey = "notified-stories";
// Stories that we've seen over the past week.
// If we've seen something more than 24 hours ago, we remove it
// This allows for stories posted e.g. 3 days ago to hit 500 points today
// [{ story: {}, seen: 1234567890 }]
const seenKey = "seen-stories";
// To cache the points to clear cache when they change
const prefKey = "preferences";

const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

function getShortcut(index: number) {
  const key = index + 1;
  return key >= 1 && key <= 9
    ? { modifiers: ["cmd"] as Keyboard.KeyModifier[], key: String(key) as Keyboard.KeyEquivalent }
    : undefined;
}

export default function Command() {
  const { points, enableNotifications, useStoryIcon } = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);

  // Memoize cache reads and parse operations
  const readStories = useMemo(() => {
    const cached = cache.get(readKey);
    return new Set(JSON.parse(cached ?? "[]") as string[]);
  }, []);

  // Used for managing notifications so the user is only notified once
  const notifiedStories = useMemo(() => {
    const cached = cache.get(notifiedKey);
    return new Set(JSON.parse(cached ?? "[]") as string[]);
  }, []);

  const seenStories = useMemo(() => {
    const cached = cache.get(seenKey);
    return JSON.parse(cached ?? "[]") as { story: Story; seen: number }[];
  }, []);

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

  if (cache.get(prefKey) !== points) {
    // if the points have changed, clear the cache
    cache.clear();
  }

  useEffect(() => {
    setError(null);
    setLoading(true);
    // cache the points we used
    cache.set(prefKey, points);
    getStories(points || "500", { cache })
      .then(async (stories) => {
        const now = Date.now();
        const seenStoriesMap = new Map(seenStories.map((s) => [s.story.external_url, s]));

        // Get list of unseen stories (they aren't in the cache)
        const unseenStories = stories
          .filter((story) => !seenStoriesMap.has(story.external_url))
          .map((story) => ({ story, seen: now }));

        // Show a notification with the first story if there are unseen stories (and check there are seen stories to prevent notification on first load)
        const show = unseenStories.length > 0 && seenStories.length > 0 && enableNotifications;
        const { story: latest } = unseenStories?.[0] ?? {};
        if (show && latest && !notifiedStories.has(latest.external_url)) {
          // Only ever notify about a story once
          notifiedStories.add(latest.external_url);
          cache.set(notifiedKey, JSON.stringify(Array.from(notifiedStories)));
          const icon = useStoryIcon ? await getFavicon(latest.url) : `${environment.assetsPath}/icon-128.png`;
          await showNotification({
            title: "Hacker News Top Stories",
            message: latest.title,
            icon,
            url: latest.external_url,
          });
        }

        // merge everything now with a seen prop
        const allStoriesSeen = [...seenStories, ...unseenStories].sort((a, b) => b.seen - a.seen);
        cache.set(seenKey, JSON.stringify(allStoriesSeen));

        return allStoriesSeen.filter(({ seen }) => now - seen < twentyFourHoursInMs).map(({ story }) => story);
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
              cache.set(readKey, JSON.stringify(Array.from(readStories)));
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

  const getPointsFromContent = (content: string) => {
    const match = content.match(/Points: (\d+)/);
    return match ? match[1] : null;
  };

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
        cache.set(readKey, JSON.stringify(Array.from(readStories)));
        // force update the icon
        setStories((prev) => [...prev]);
        open(story.external_url);
      }}
    />
  ));
};
