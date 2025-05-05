import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { usePromise, withCache } from "@raycast/utils";
import { summarizeChannel } from "./utils/summarizer";
import { listChannels } from "./utils/slackApi";

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setLoading] = useState(false);
  // Cache the channel list for 24 h to avoid hitting Slack rate limits
  const cachedListChannels = withCache(listChannels, { maxAge: 24 * 60 * 60 * 1000 });
  const { data: channels, isLoading: isChannelLoading } = usePromise(cachedListChannels, []);

  // Command‑specific OpenAI prompt from preferences
  const preferences = getPreferenceValues();
  const customPrompt = preferences.openaiPrompt;

  async function handleSubmit(values: { channel: string; days: string }) {
    // Show a toast to indicate that the summary is being generated
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating summary...",
    });

    setLoading(true);

    try {
      const daysNumber = Math.max(0, Number(values.days ?? 7));
      const summary = await summarizeChannel(values.channel, daysNumber, customPrompt);

      push(
        <Detail
          markdown={summary}
          navigationTitle={`#${values.channel}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Summary" content={summary} />
            </ActionPanel>
          }
        />,
      );

      toast.style = Toast.Style.Success;
      toast.title = "Completed";
      toast.message = `Summary for #${values.channel} generated successfully.`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't generate summary";
      if (err instanceof Error) {
        toast.message = err.message;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Summarize" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="channel" title="Channel" isLoading={isChannelLoading} throttle placeholder="Select channel…">
        {channels?.map((c: { id: string; name: string }) => (
          <Form.Dropdown.Item key={c.id} value={c.name} title={`#${c.name}`} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="days" title="Days to Look Back" placeholder="7" defaultValue="7" />
    </Form>
  );
}
