import { Action, ActionPanel, Form, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { usePromise, withCache } from "@raycast/utils";
import { summarizeChannel } from "./utils/summarizer";
import { fetchChannels } from "./utils/slackApi";
import { SummaryDisplay } from "./components/SummaryDisplay";
import { useToast } from "./utils/useToast";

interface Channel {
  id: string;
  name: string;
}

interface FormValues {
  channel: string;
  days: string;
}

interface Preferences {
  openaiPrompt: string;
}

const DEFAULT_DAYS = "7";
const CHANNELS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function ChannelForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  // Cache the channel list for 24h to avoid hitting Slack rate limits
  const cachedListChannels = withCache(fetchChannels, { maxAge: CHANNELS_CACHE_DURATION });
  const { data: channels, isLoading: isChannelLoading } = usePromise(cachedListChannels, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Summarize" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="channel" title="Channel" isLoading={isChannelLoading} throttle placeholder="Select channel…">
        {channels?.map((channel: Channel) => (
          <Form.Dropdown.Item key={channel.id} value={channel.name} title={`#${channel.name}`} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="days" title="Days to Look Back" placeholder={DEFAULT_DAYS} defaultValue={DEFAULT_DAYS} />
    </Form>
  );
}

export default function Command() {
  const [values, setValues] = useState<FormValues>();
  const { openaiPrompt } = getPreferenceValues<Preferences>();
  const toast = useToast();

  const {
    isLoading,
    data: summaryStream,
    error,
    revalidate,
  } = usePromise(
    async (v?: FormValues) => {
      if (!v) return;

      try {
        const days = Math.max(0, Number(v.days ?? DEFAULT_DAYS));
        const result = await summarizeChannel(v.channel, days, openaiPrompt);
        return result;
      } catch (e) {
        toast.showErrorToast("Couldn't generate summary", e);
        throw e;
      }
    },
    [values],
  );

  return values ? (
    <SummaryDisplay
      isLoading={isLoading}
      summaryStream={summaryStream}
      error={error as Error | undefined}
      onRegenerate={revalidate}
      navigationTitle="Channel summary"
    />
  ) : (
    <ChannelForm onSubmit={setValues} />
  );
}
