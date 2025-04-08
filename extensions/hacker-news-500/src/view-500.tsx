import { useEffect, useState } from "react";
import { Cache, Icon, MenuBarExtra, open } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { getStories } from "./hackernews";
import { Story } from "./types";

// Stories that the user clicked on
const readCache = new Cache();
const key = "read-stories";
const read = JSON.parse(readCache.get(key) ?? "[]") as string[];
// Stories that we've seen over the past week.
// If we've seen something more than 24 hours ago, we remove it
// This allows for stories posted e.g. 3 days ago to hit 500 points today
// [{ story: {}, seen: 1234567890 }]
const seenCache = new Cache();
const seenKey = "seen-stories";
const seenStories = JSON.parse(seenCache.get(seenKey) ?? "[]") as { story: Story; seen: number }[];

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const hasUnread = stories.some((story) => !read.includes(story.external_url));
  const unreadCount = stories.filter((story) => !read.includes(story.external_url)).length;

  useEffect(() => {
    setLoading(true);
    getStories()
      .then((stories) => {
        const now = Date.now();

        // Get list of unseen stories (they aren't in the seenCache)
        const unseenStories = stories.filter((story) => {
          return !seenStories.find((seenStory) => seenStory.story.external_url === story.external_url);
        });

        const allStoriesSeen = [...seenStories, ...unseenStories.map((story) => ({ story, seen: now }))].toSorted(
          (a, b) => {
            const aDate = new Date(a.seen).getTime();
            const bDate = new Date(b.seen).getTime();
            return bDate - aDate;
          },
        );
        seenCache.set(seenKey, JSON.stringify(allStoriesSeen));
        const twentyFourHoursInMs = 240 * 60 * 60 * 1000;
        return allStoriesSeen
          .filter(({ seen }) => {
            const storyDate = new Date(seen).getTime();
            return now - storyDate < twentyFourHoursInMs;
          })
          .map(({ story }) => story);
      })
      .then((stories) => setStories(stories))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MenuBarExtra
      icon={{
        source: hasUnread ? "icon.png" : "icon-64-dark.png",
        tintColor: hasUnread ? null : { light: "#000000", dark: "#ffffff", adjustContrast: true },
      }}
      tooltip={`Hacker News 500+ Stories${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
      isLoading={loading}
    >
      {stories.length === 0 && <MenuBarExtra.Item title="No recent stories" />}
      {stories?.map((story: Story) => (
        <MenuBarExtra.Item
          key={story.external_url}
          icon={
            read.includes(story.external_url)
              ? getFavicon(story.external_url)
              : {
                  source: Icon.Dot,
                  tintColor: "#E96E37",
                }
          }
          title={story.title.length > 50 ? `${story.title.slice(0, 50)}...` : story.title}
          tooltip={`${read.includes(story.external_url) ? "" : "(unread) "}${story.title}`}
          onAction={() => {
            open(story.external_url);
            const current = JSON.parse(readCache.get(key) ?? "[]");
            readCache.set(key, JSON.stringify([...current, story.external_url]));
            // force update the icon
            setStories((prev) => structuredClone(prev));
          }}
        />
      ))}
    </MenuBarExtra>
  );
}
