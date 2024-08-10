import { ActionPanel, showToast, Toast, Action, Form } from "@raycast/api";
import { getTopics, getTrackEntry, startTrackEntry } from "./storage";
import { useEffect, useState } from "react";
import { Topic } from "./types";

export default function Command() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  function handleStart() {
    if (selectedTopic === null) {
      showToast(Toast.Style.Failure, "No topic selected", "Please select a topic");
      return;
    }

    if (checkEntryAlreadyTracked(selectedTopic)) return;

    const started = startTrackEntry(selectedTopic);
    if (!started) showToast(Toast.Style.Failure, "Error saving track entry", "Please try again");
    else showToast(Toast.Style.Success, "Started tracking", `Topic: ${selectedTopic.name}`);
  }

  function checkEntryAlreadyTracked(topic: Topic): boolean {
    const trackEntry = getTrackEntry(topic.name);

    if (trackEntry !== null) {
      showToast(
        Toast.Style.Failure,
        "Topic already being tracked",
        'Please stop the current tracking with "Track stop" before starting a new one',
      );
      return true;
    }

    return false;
  }

  function handleTopicChange(newValue: string): void {
    const topic = topics.find((topic) => topic.name === newValue);

    if (topic === undefined) return;

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
          <Action.SubmitForm title="Start Tracking" onSubmit={handleStart} />
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
