import { ActionPanel, Detail, Icon, List, ListItem, OpenInBrowserAction } from "@raycast/api";
import { useChannels } from "./hooks/useChannels";
import { useProfile } from "./hooks/useProfile";
import { prefs } from "./util/preferences";

export default function Command() {
  const { data: user, error: userError } = useProfile(prefs().accesstoken);

  const { data, error: channelError } = useChannels(prefs().accesstoken, user?.id);

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
  console.log(JSON.stringify(data, null, 2));
  return (
    <List>
      {data.channels.map((chan) => (
        <ListItem
          key={chan.id}
          title={chan.title}
          subtitle={`${chan.length === 1 ? "1 block" : `${chan.length} blocks`}`}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://are.na/channels/${chan.slug}`} icon={Icon.Globe} title="Open" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
