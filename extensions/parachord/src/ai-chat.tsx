import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { openParachord } from "./utils";

const QUICK_PROMPTS = [
  { title: "Play something chill", value: "play something chill" },
  {
    title: "Play something upbeat",
    value: "play something upbeat for working out",
  },
  {
    title: "Play similar to current",
    value: "play something similar to what's playing",
  },
  {
    title: "Create a playlist",
    value: "create a playlist based on my recent listening",
  },
  { title: "What's playing?", value: "what am I listening to right now?" },
  {
    title: "Recommend new artists",
    value: "recommend some new artists I might like",
  },
  {
    title: "Play something for focus",
    value: "play something good for focus and concentration",
  },
  {
    title: "Play something nostalgic",
    value: "play something nostalgic from the 90s",
  },
];

export default function Command(props: LaunchProps<{ arguments: Arguments.AiChat }>) {
  const initialPrompt = props.arguments?.prompt || "";
  const [prompt, setPrompt] = useState(initialPrompt);

  const handleSubmit = async () => {
    if (prompt.trim()) {
      await openParachord("chat", [], { prompt: prompt.trim() }, `Sent to AI DJ: "${prompt.trim().slice(0, 30)}..."`);
    } else {
      await openParachord("chat", [], {}, "Opening AI DJ chat");
    }
  };

  const handleQuickPrompt = async (value: string) => {
    await openParachord("chat", [], { prompt: value }, `Sent to AI DJ: "${value.slice(0, 30)}..."`);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to AI DJ" onSubmit={handleSubmit} />
          <ActionPanel.Section title="Quick Prompts">
            {QUICK_PROMPTS.map((qp) => (
              <Action key={qp.value} title={qp.title} onAction={() => handleQuickPrompt(qp.value)} />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Message"
        placeholder="Ask the AI DJ anything..."
        value={prompt}
        onChange={setPrompt}
        info="Ask for recommendations, create playlists, control playback, or just chat about music"
      />
      <Form.Description
        title="Examples"
        text="• Play something chill for a Sunday morning
• Create a playlist of 90s alternative rock
• What's been my most played artist this month?
• Skip this track and never play it again"
      />
    </Form>
  );
}
