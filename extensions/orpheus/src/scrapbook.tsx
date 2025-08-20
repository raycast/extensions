import { useState, useEffect } from "react";
import { List } from "@raycast/api";

interface User {
  username: string;
  streakCount: number;
  maxStreaks: number;
}

interface Post {
  user: User;
  postedAt: string;
  text: string;
  slackUrl: string;
  attachments: string[];
}

interface ApiResponse {
  [key: string]: Post;
}

export default function Metadata() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://scrapbook.hackclub.com/api/posts", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ApiResponse;
        setApiData(data);
      } catch (err) {
        console.error(err);
        setError("Error loading data");
      }
    };

    fetchData();
  }, []);

  return (
    <List isShowingDetail>
      {apiData === null && !error && <List.EmptyView title="Loading..." />}
      {error && <List.EmptyView title={error} />}
      {apiData &&
        Object.entries(apiData).map(([key, value]) => (
          <List.Item
            key={key}
            title={value.user?.username}
            detail={
              <List.Item.Detail
                markdown={`# ${value.user.username}'s Scrapbook Post [${value.user.streakCount}/${value.user.maxStreaks}]  \n \n ## Posted On ${new Date(value.postedAt).toLocaleString()} \n \n ${value.text} ([Open On Slack](${value.slackUrl}))\n \n ![](${value.attachments[0]})`}
              />
            }
          />
        ))}
    </List>
  );
}
