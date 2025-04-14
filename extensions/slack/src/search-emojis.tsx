import { Action, ActionPanel, Grid } from "@raycast/api";
import { withSlackClient } from "./shared/withSlackClient";
import { useCachedPromise } from "@raycast/utils";
import { getSlackWebClient } from "./shared/client/WebClient";

function EmojiItem({ name, url }: { name: string; url: string }) {
  return (
    <Grid.Item
      content={url}
      title={`:${name}:`}
      actions={
        <ActionPanel>
          <Action.Paste content={`:${name}:`} />
          <Action.CopyToClipboard content={`:${name}:`} />
        </ActionPanel>
      }
    />
  );
}

function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const slackWebClient = getSlackWebClient();
    return await slackWebClient.emoji.list();
  }, []);

  return (
    <Grid isLoading={isLoading} columns={8} inset={Grid.Inset.Medium}>
      {data &&
        data.emoji &&
        Object.entries(data.emoji).map(([name, url]) => <EmojiItem key={name} name={name} url={url} />)}
    </Grid>
  );
}

export default withSlackClient(Command);
