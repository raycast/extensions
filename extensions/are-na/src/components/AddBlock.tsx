import {
  ActionPanel,
  ActionPanelItem,
  Detail,
  Icon,
  Form,
  SubmitFormAction,
  FormTextField,
  FormTextArea,
} from "@raycast/api";
import { useState } from "react";
import { ChannelList } from "../components/ChannelList";
import { useChannels } from "../hooks/useChannels";
import { useCreateBlock } from "../hooks/useCreateBlock";
import { useProfile } from "../hooks/useProfile";

interface AddBlockFormProps {
  selectedChannel: string;
  isLink?: boolean;
}
const AddBlockForm = ({ selectedChannel, isLink }: AddBlockFormProps) => {
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
      {isLink ? (
        <FormTextField id="source" title="Source" value={message} onChange={(str) => setMessage(str)} />
      ) : (
        <FormTextArea
          id="source"
          title="Message"
          placeholder={"Write your markdown content here."}
          value={message}
          onChange={(str) => setMessage(str)}
        />
      )}
    </Form>
  );
};

interface AddBlockProps {
  isLink?: boolean;
}

export const AddBlock = ({ isLink }: AddBlockProps) => {
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
  return <AddBlockForm isLink={isLink} selectedChannel={selectedChannel} />;
};
