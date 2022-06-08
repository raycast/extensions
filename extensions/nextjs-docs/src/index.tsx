import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import Topic from "./Topic";
import { TopicType } from "./types/GithubType";
import { useEffect, useState } from "react";
import { getPagesFromCache, checkForUpdates } from "./services/NextjsPages";

export default function main() {
  const [topics, setTopics] = useState<TopicType[]>();

  useEffect(() => {
    async function getAllPages() {
      const toast = await showToast({
        style: Toast.Style.Failure,
        title: "",
      });
      const cached_pages = await getPagesFromCache().catch((err) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Fetching fresh data...";
        toast.show();
      });

      if (cached_pages) {
        setTopics(JSON.parse(cached_pages));
      }

      const updated_data = await checkForUpdates();
      if (updated_data) {
        setTopics(JSON.parse(updated_data));
      }

      toast.hide();
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
