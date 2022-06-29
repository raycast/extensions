import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import Topic from "./Topic";
import { TopicType } from "./types/GithubType";
import { useEffect, useState } from "react";
import { getPagesFromCache, checkForUpdates } from "./services/NextjsPages";

export default function main() {
  const [topics, setTopics] = useState<TopicType[]>();

  useEffect(() => {
    async function getAllPages() {
      const cached_pages = await getPagesFromCache().catch((err) => {
        console.log("Failed to fetch data!");
      });

      if (cached_pages) {
        setTopics(JSON.parse(cached_pages));
      }

      const updated_data = await checkForUpdates();
      if (updated_data) {
        setTopics(JSON.parse(updated_data));
      }
    }
    getAllPages();
  }, []);

  if (!topics) {
    return <List isLoading />;
  }

  return (
    <List>
      {topics.map((topic) => (
        <List.Item
          key={topic.sha}
          icon={Icon.TextDocument}
          title={topic.title}
          actions={
            <ActionPanel>
              <Action.Push title={`Browse ${topic.title}`} target={<Topic topic={topic} />} />
            </ActionPanel>
          }
          accessories={[{ text: topic.filepath }]}
        />
      ))}
    </List>
  );
}
