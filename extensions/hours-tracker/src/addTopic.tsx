import { ActionPanel, showToast, Toast, Action, Form } from "@raycast/api";
import { addTopic, getTopics } from "./storage";
import { useEffect, useState } from "react";
import { Topic } from "./types";

export default function Command() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopicName, setCurrentTopic] = useState<string>("");

  function addNewTopic() {
    const topic = topics.filter((t) => t.name === currentTopicName);

    if (topic.length > 0) {
      showToast(Toast.Style.Failure, "Topic already exists", "Please create another topic");
      return;
    }

    if (currentTopicName === "") {
      showToast(Toast.Style.Failure, "No topic name", "Please select a name for the topic");
      return;
    }

    const added = addTopic({ name: currentTopicName, createdAt: Date.now() });
    if (!added) {
      showToast(Toast.Style.Failure, "Error saving topic", "Please try again");
      return;
    }

    showToast(Toast.Style.Success, "Added topic", `Topic: ${currentTopicName}`);
  }

  function updateTopicName(newValue: string): void {
    setCurrentTopic(newValue);
  }

  useEffect(() => {
    const topics = getTopics();
    if (topics === null) {
      showToast(Toast.Style.Failure, "Error parsing topics", "Please create a topic");
      return;
    }
    setTopics(topics);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create New Topic" onSubmit={addNewTopic} />
        </ActionPanel>
      }
    >
      <Form.TextField id="topic" title="Topic" placeholder="Enter topic name" onChange={updateTopicName} />
    </Form>
  );
}
