import { Detail, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

interface Preferences {
  "scrapbook-user": string;
}

interface Profile {
  username: string;
  avatar: string;
  streakCount: number;
  maxStreaks: number;
  website: string;
}

interface Post {
  postedAt: string;
  attachments: string[];
  text: string;
  slackUrl: string;
}

interface ScrapbookData {
  profile: Profile;
  posts: Post[];
}

interface Language {
  name: string;
}

interface HackatimeData {
  data: {
    human_readable_total: string;
    human_readable_daily_average: string;
    languages: Language[];
  };
}

export default function Main() {
  const [apiData, setApiData] = useState<ScrapbookData | null>(null);
  const [hackatime, setHackatime] = useState<HackatimeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fetchScrapbookData = async () => {
      try {
        const response = await fetch(`https://scrapbook.hackclub.com/api/users/${preferences["scrapbook-user"]}`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ScrapbookData;
        setApiData(data);
      } catch (err) {
        console.error("Error fetching scrapbook data:", err);
        setError("Error loading scrapbook data");
      }
    };

    const fetchHackatimeData = async () => {
      try {
        const response = await fetch(
          `https://hackatime.hackclub.com/api/v1/users/${preferences["scrapbook-user"]}/stats`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setHackatime(data as HackatimeData);
      } catch (err) {
        console.error("Error fetching hackatime data:", err);
        setError("Error loading hackatime data");
      }
    };

    fetchScrapbookData();
    fetchHackatimeData();
  }, [preferences]);

  const markdown = `
# ${apiData ? apiData.profile.username : "Loading..."}

![](${apiData ? apiData.profile.avatar : ""})

## Posts

${
  apiData
    ? apiData.posts
        .map(
          (post: Post) =>
            `- Posted At: ${new Date(post.postedAt).toLocaleString()} \n \n ![](${post.attachments[0] || ""})  \n \n ${post.text}  ([Open](${post.slackUrl}))`,
        )
        .join("\n")
    : "Loading..."
}

${error ? `\n\n**Error:** ${error}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={apiData ? apiData.profile.username : "Loading..."}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="🔥Current Streak"
            text={`${apiData ? apiData.profile.streakCount : "Loading..."}`}
          />
          <Detail.Metadata.Label
            title="🔥Maximum Streak"
            text={`${apiData ? apiData.profile.maxStreaks : "Loading..."}`}
          />
          <Detail.Metadata.Link
            title="Open On Scrapbook"
            text="Scrapbook"
            target={`https://scrapbook.hackclub.com/${apiData ? apiData.profile.username : ""}`}
          />
          <Detail.Metadata.Link
            title="Website"
            text="Access Personal Website"
            target={`${apiData ? apiData.profile.website : ""}`}
          />
          <Detail.Metadata.TagList title="Hackatime">
            <Detail.Metadata.TagList.Item
              text={hackatime ? `Total: ${hackatime.data.human_readable_total}` : "Loading..."}
              color={"#00ff00"}
            />
            <Detail.Metadata.TagList.Item
              text={hackatime ? `Daily Average: ${hackatime.data.human_readable_daily_average}` : "Loading..."}
              color={"red"}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Languages">
            {hackatime &&
              hackatime.data.languages.map((lang: Language) => (
                <Detail.Metadata.TagList.Item text={`${lang.name}`} key={lang.name} color={"yellow"} />
              ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
