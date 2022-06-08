import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import TopicDetail from "./TopicDetail";
import { Topic } from "./types/GithubType";
import { useEffect, useState } from "react";
import { getTopicsFromCache as getTopics } from "./services/Github";

export default function main() {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    getTopics()
      .then((results: string) => {
        setTopics(JSON.parse(results));
      })
      .catch((err: string) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Sorry, something went wrong! ",
          message: err,
        });
      });
  }, []);

  return (
    <List searchBarPlaceholder="Search documentation..." isLoading={topics.length === 0}>
      {topics.map((topic) => (
        <List.Item
          key={topic.sha}
          icon={Icon.TextDocument}
          title={topic.title}
          actions={
            <ActionPanel>
              <Action.Push title={`Browse ${topic.title}`} target={<TopicDetail topic={topic} />} />
            </ActionPanel>
          }
          accessories={[{ text: topic.filepath }]}
        />
      ))}
    </List>
  );
}
