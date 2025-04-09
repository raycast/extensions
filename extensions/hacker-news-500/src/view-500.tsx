import { useEffect, useState } from "react";
import { Cache, Icon, MenuBarExtra, open, getPreferenceValues } from "@raycast/api";
import { getStories } from "./hackernews";
import { Story } from "./types";

const cache = new Cache();
// Stories that the user clicked on
const readKey = "read-stories";
// Stories that we've seen over the past week.
// If we've seen something more than 24 hours ago, we remove it
// This allows for stories posted e.g. 3 days ago to hit 500 points today
// [{ story: {}, seen: 1234567890 }]
const seenKey = "seen-stories";
// To cache the preference values
const prefKey = "preferences";

export default function Command() {
  const { points } = getPreferenceValues<Preferences>();
  const readStories = JSON.parse(cache.get(readKey) ?? "[]") as string[];
  const seenStories = JSON.parse(cache.get(seenKey) ?? "[]") as { story: Story; seen: number }[];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);

  const unreadCount = stories.filter((story) => !readStories.includes(story.external_url)).length;

  if (cache.get(prefKey) !== points) {
    // if the points have changed, clear the cache
    cache.set(readKey, JSON.stringify([]));
    cache.set(seenKey, JSON.stringify([]));
  }

  useEffect(() => {
    setError(null);
    setLoading(true);
    // cache the points we used
    cache.set(prefKey, points);
    getStories(points || "500", { cache })
      .then((stories) => {
        const now = Date.now();

        // Get list of unseen stories (they aren't in the cache)
        const unseenStories = stories
          .filter((story) => {
            return !seenStories.find((seenStory) => seenStory.story.external_url === story.external_url);
          })
          .map((story) => ({ story, seen: now }));

        // merge everything now with a seen prop
        const allStoriesSeen = [...seenStories, ...unseenStories].toSorted((a, b) => {
          const aDate = new Date(a.seen).getTime();
          const bDate = new Date(b.seen).getTime();
          return bDate - aDate;
        });
        cache.set(seenKey, JSON.stringify(allStoriesSeen));

        const twentyFourHoursInMs = 240 * 60 * 60 * 1000;
        return allStoriesSeen
          .filter(({ seen }) => {
            // We dont show anything seen over 24 hours ago
            const storyDate = new Date(seen).getTime();
            return now - storyDate < twentyFourHoursInMs;
          })
          .map(({ story }) => story);
      })
      .then((stories) => setStories(stories))
      .catch((error) => setError(`Error: ${error.message}`))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MenuBarExtra
      icon={{
        source: unreadCount > 0 ? "icon.png" : "icon-64-dark.png",
        tintColor: unreadCount > 0 ? null : { light: "#000000", dark: "#ffffff", adjustContrast: true },
      }}
      tooltip={`Hacker News 500+ Stories${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
      isLoading={loading}
    >
      <MenuItems error={error} stories={stories} setStories={setStories} readStories={readStories} />
    </MenuBarExtra>
  );
}

type MenuItemsProps = {
  error: string | null;
  stories: Story[];
  setStories: React.Dispatch<React.SetStateAction<Story[]>>;
  readStories: string[];
};
const MenuItems = ({ error, stories, setStories, readStories }: MenuItemsProps) => {
  if (error) return <MenuBarExtra.Item title={error} />;
  if (stories.length === 0) return <MenuBarExtra.Item title="No recent stories" />;

  return stories?.map((story: Story) => (
    <MenuBarExtra.Item
      key={story.external_url}
      icon={{
        source: Icon.Dot,
        tintColor: readStories.includes(story.external_url) ? { light: "#787794", dark: "gray" } : "#E96E37",
      }}
      title={story.title.length > 50 ? `${story.title.slice(0, 50)}...` : story.title}
      tooltip={`${readStories.includes(story.external_url) ? "" : "(unread) "}${story.title}`}
      onAction={() => {
        const current = JSON.parse(cache.get(readKey) ?? "[]");
        cache.set(readKey, JSON.stringify([...current, story.external_url]));
        // force update the icon
        setStories((prev) => structuredClone(prev));
        open(story.external_url);
      }}
    />
  ));
};
