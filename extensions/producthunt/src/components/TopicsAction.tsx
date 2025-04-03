import React from "react";
import { ActionPanel, Action, open, showToast, Toast } from "@raycast/api";
import { Topic } from "../types";
import { generateTopicUrl } from "../util/topicUtils";

type SubmenuType = React.ComponentType<{
  title: string;
  children: React.ReactNode;
}>;

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
        {(() => {
          const Submenu = ActionPanel.Submenu as SubmenuType;
          return (
            <Submenu title="View Topics">
              {topics.map((topic) => (
                <Action
                  key={topic.id}
                  title={topic.name}
                  onAction={() => handleTopicAction(topic)}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
              ))}
            </Submenu>
          );
        })()}
      </React.Fragment>
    );
  } else {
    // Return individual actions (for use in other contexts)
    return (
      <React.Fragment>
        {topics.map((topic) => (
          <Action key={topic.id} title={`Topic: ${topic.name}`} onAction={() => handleTopicAction(topic)} />
        ))}
      </React.Fragment>
    );
  }
}
