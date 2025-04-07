import { useEffect, useState } from "react";
import { Cache, MenuBarExtra, open } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { getStories } from "./hackernews";
import { Story } from "./types";

const cache = new Cache({ capacity: 1000 });
const key = "read-stories";

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const seen = JSON.parse(cache.get(key) ?? "[]") as string[];
  const hasUnseen = stories.some((story) => !seen.includes(story.external_url));
  const unseenCount = stories.filter((story) => !seen.includes(story.external_url)).length;

  useEffect(() => {
    setLoading(true);
    getStories()
      .then((stories) => {
        const now = Date.now();
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
        return stories
          .filter((story) => {
            // Remove stories more than 24 hours old
            const storyDate = new Date(story.date_published).getTime();
            return now - storyDate < twentyFourHoursInMs;
          })
          .map((story) => {
            // Shorten the title length
            const title = story.title.length > 50 ? `${story.title.slice(0, 50)}...` : story.title;
            return { ...story, title };
          });
      })
      .then((stories) => setStories(stories))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MenuBarExtra
      icon={{
        source: hasUnseen ? "icon.png" : "icon-64-dark.png",
        tintColor: hasUnseen ? null : { light: "#000000", dark: "#ffffff", adjustContrast: true },
      }}
      tooltip={`Hacker News 500+ Stories${unseenCount > 0 ? ` (${unseenCount})` : ""}`}
      isLoading={loading}
    >
      {stories?.map((story: Story) => (
        <MenuBarExtra.Item
          key={story.external_url}
          icon={getFavicon(story.url)}
          title={story.title}
          tooltip={`${seen.includes(story.external_url) ? "(read) " : ""}${story.title}`}
          onAction={() => {
            open(story.external_url);
            const current = JSON.parse(cache.get(key) ?? "[]");
            cache.set(key, JSON.stringify([...current, story.external_url]));
          }}
        />
      ))}
    </MenuBarExtra>
  );
}
