import React from "react";
import { ActionPanel, Action, List } from "@raycast/api";

interface EMOJI {
  icon: string;
  title: string;
}

const EMOJIS: EMOJI[] = [
  {
    icon: "😃",
    title: "I like this and I want the author to know it!",
  },
  {
    icon: "🔧",
    title: "I think this needs to be changed.",
  },
  {
    icon: "❓",
    title: "I have a question.",
  },
  {
    icon: "💭",
    title: "Let me think out loud here for a minute.",
  },
  {
    icon: "🌱",
    title: "Planting a seed for future.",
  },
  {
    icon: "📝",
    title: "This is an explanatory note.",
  },
  {
    icon: "⛏️",
    title: "This is a nitpick.",
  },
  {
    icon: "♻️",
    title: "Suggestion for refactoring.",
  },
  {
    icon: "🏕",
    title: "Here is an opportunity to leave the code cleaner than we found it.",
  },
  {
    icon: "📌",
    title: "This is a concern that is out of scope and should be staged appropriately for follow up.",
  },
];

export default function Command() {
  return (
    <List searchBarPlaceholder="Search Emojis">
      <List.Section title="Emojis">
        {EMOJIS.map((emoji) => (
          <List.Item
            key={emoji.icon}
            icon={emoji.icon}
            title={emoji.title}
            actions={
              <ActionPanel>
                <Action.Paste content={emoji.icon} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="More">
        <List.Item
          key={"📘"}
          icon={"📘"}
          title={"Open Code Review Emoji Guide"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://github.com/erikthedeveloper/code-review-emoji-guide" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
