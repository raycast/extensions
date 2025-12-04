import React from "react";
import { ActionPanel, Action, open, showToast, Toast, Icon } from "@raycast/api";
import { Topic } from "../types";
import { generateTopicUrl } from "../util/topicUtils";

interface TopicsActionProps {
  topics: Topic[];
  showAsSubmenu?: boolean;
}

export function TopicsAction({ topics, showAsSubmenu = true }: TopicsActionProps) {
  if (!topics || topics.length === 0) {
    return null;
  }

  const handleTopicAction = (topic: Topic) => {
    const topicUrl = generateTopicUrl(topic);

    showToast({
      style: Toast.Style.Success,
      title: `Opening topic: ${topic.name}`,
    });

    // Open the topic URL in the browser
    open(topicUrl);
  };

  if (showAsSubmenu) {
    return (
      <React.Fragment>
        <ActionPanel.Submenu title="View Topics">
          {topics.map((topic) => (
            <Action key={topic.id} title={topic.name} onAction={() => handleTopicAction(topic)} icon={Icon.Tag} />
          ))}
        </ActionPanel.Submenu>
      </React.Fragment>
    );
  } else {
    // Return individual actions (for use in other contexts)
    return (
      <React.Fragment>
        {topics.map((topic) => (
          <Action
            key={topic.id}
            title={`Topic: ${topic.name}`}
            onAction={() => handleTopicAction(topic)}
            icon={Icon.Tag}
          />
        ))}
      </React.Fragment>
    );
  }
}
