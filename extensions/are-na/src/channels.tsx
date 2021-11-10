import { ActionPanel, Detail, Icon, OpenInBrowserAction } from "@raycast/api";
import { ChannelList } from "./components/ChannelList";
import { useChannels } from "./hooks/useChannels";

export default function Command() {
  const { data, error: channelError } = useChannels();

  if (channelError) {
    return (
      <Detail
        markdown={`
# Something went wrong.
\`\`\`
${channelError}
\`\`\`
`}
      />
    );
  }
  if (!data) return <Detail markdown="Loading your channels..." />;
  console.log(JSON.stringify(data, null, 2));
  return (
    <ChannelList
      channels={data.channels}
      actions={(chan) => (
        <ActionPanel>
          <OpenInBrowserAction url={`https://are.na/channels/${chan.slug}`} icon={Icon.Globe} title="Open" />
        </ActionPanel>
      )}
    />
  );
}
