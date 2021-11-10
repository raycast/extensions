import { ActionPanel, ActionPanelItem, Detail, Icon, Form, SubmitFormAction, FormTextField } from "@raycast/api";
import { useState } from "react";
import { ChannelList } from "./components/ChannelList";
import { useChannels } from "./hooks/useChannels";
import { useCreateBlock } from "./hooks/useCreateBlock";
import { useProfile } from "./hooks/useProfile";

interface AddBlockFormProps {
  selectedChannel: string;
}
const AddBlockForm = ({ selectedChannel }: AddBlockFormProps) => {
  const createBlock = useCreateBlock({
    slug: selectedChannel || "",
  });
  const [message, setMessage] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Add"
            onSubmit={() => {
              createBlock.run({
                source: message,
              });
              setMessage("");
            }}
          />
        </ActionPanel>
      }
    >
      <FormTextField id="source" title="Source" value={message} onChange={(str) => setMessage(str)} />
    </Form>
  );
};

const AddBlock = () => {
  const { error: userError } = useProfile();
  const { data, error: channelError } = useChannels();
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);

  if (channelError || userError) {
    return (
      <Detail
        markdown={`
# Something went wrong.
\`\`\`
${channelError || userError}
\`\`\`
`}
      />
    );
  }

  if (!data) return <Detail markdown="Loading your channels..." />;

  if (!selectedChannel)
    return (
      <ChannelList
        channels={data.channels}
        actions={(chan) => (
          <ActionPanel>
            <ActionPanelItem title="Select" icon={Icon.ArrowRight} onAction={() => setSelectedChannel(chan.slug)} />
          </ActionPanel>
        )}
      />
    );
  return <AddBlockForm selectedChannel={selectedChannel} />;
};

export default function Command() {
  return <AddBlock />;
}
