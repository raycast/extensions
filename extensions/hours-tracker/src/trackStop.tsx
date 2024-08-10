import { ActionPanel, showToast, Toast, Action, Form } from "@raycast/api";
import { getTopics, getTrackEntry, stopTrackEntry } from "./storage";
import { useEffect, useState } from "react";
import { Topic } from "./types";

export default function Command() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  function handleStop() {
    if (selectedTopic === null) {
      showToast(Toast.Style.Failure, "No topic selected", "Please select a topic");
      return;
    }

    if (!checkEntryAlreadyTracked(selectedTopic)) return;

    const stopped = stopTrackEntry(selectedTopic);
    if (!stopped) showToast(Toast.Style.Failure, "Error saving track entry", "Please try again");
    else showToast(Toast.Style.Success, "Stopped tracking", `Topic: ${selectedTopic.name}`);
  }

  function checkEntryAlreadyTracked(topic: Topic): boolean {
    const trackEntry = getTrackEntry(topic.name);

    if (trackEntry === null) {
      showToast(
        Toast.Style.Failure,
        "Topic is not being tracked",
        'Please first start tracking the topic with "Track start"',
      );
      return false;
    }

    return true;
  }

  function handleTopicChange(newValue: string): void {
    const topic = topics.find((t) => t.name === newValue);

    if (topic === undefined) {
      return;
    }

    setSelectedTopic(topic);
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
          <Action.SubmitForm title="Stop Tracking" onSubmit={handleStop} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="topic" title="Topic" onChange={handleTopicChange}>
        {topics.map((topic) => (
          <Form.Dropdown.Item key={topic.name} title={topic.name} value={topic.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
