import { ActionPanel, showToast, Toast, Action, List, Icon, Detail, confirmAlert, Alert } from "@raycast/api";
import { getTopics, deleteTopic, isTopicBeingTracked, STORAGE_OBJECTS } from "./storage";
import { useEffect, useState } from "react";
import { Topic } from "./types";
import { useEnsureFiles } from "./hooks/useEnsureFiles";

export default function Command() {
  const objectsToEnsure = [STORAGE_OBJECTS.TOPICS];
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const { objectsExists } = useEnsureFiles(objectsToEnsure);

  async function handleDelete(topicToDelete: Topic) {
    const confirmed = await confirmAlert({
      title: "Delete Topic",
      message: `Are you sure you want to delete the topic "${topicToDelete.name}"? This will delete ALL tracked entries for this topic.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    if (topics === null) {
      showToast(Toast.Style.Failure, "Error parsing topics", "Please create a topic");
      return;
    }

    const isBeingTracked = isTopicBeingTracked(topicToDelete);
    if (isBeingTracked) {
      showToast(Toast.Style.Failure, "Topic is being tracked", "Please stop tracking the topic before deleting it");
      return;
    }

    const deleted = deleteTopic(topicToDelete, true);
    if (!deleted) {
      showToast(Toast.Style.Failure, "Error deleting topic", "Please try again");
    } else {
      showToast(Toast.Style.Success, "Deleted topic", `Topic: ${topicToDelete.name}`);
      const newTopics = topics.filter((topic) => topic.name !== topicToDelete.name);
      setTopics(newTopics);
    }
  }

  useEffect(() => {
    const topics = getTopics();

    if (topics === null) {
      showToast(Toast.Style.Failure, "Error parsing topics", "Please create a topic");
      return;
    }
    setTopics(topics);
  }, []);

  return objectsExists === false ? (
    <Detail markdown={`Error: Topics file not found`} />
  ) : (
    <List isLoading={!topics}>
      {topics?.map((item, index) => (
        <TopicListItem key={item.name} item={item} index={index} handleDelete={handleDelete} />
      ))}
    </List>
  );
}

function TopicListItem(props: { item: Topic; index: number; handleDelete: (topic: Topic) => void }) {
  return (
    <List.Item
      key={props.item.name}
      title={props.item.name}
      actions={<Actions item={props.item} handleDelete={() => props.handleDelete(props.item)} />}
    />
  );
}

function Actions(props: { item: Topic; handleDelete: () => void }) {
  return (
    <ActionPanel title={props.item.name}>
      <ActionPanel.Section>
        {props.item.name && (
          <Action
            title="Delete Topic"
            onAction={props.handleDelete}
            icon={Icon.Minus}
            style={Action.Style.Destructive}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
