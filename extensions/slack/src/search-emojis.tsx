import { useMemo, useState } from "react";
import { Action, ActionPanel, Grid, AI, environment } from "@raycast/api";
import { useAI, useCachedPromise } from "@raycast/utils";
import { withSlackClient } from "./shared/withSlackClient";
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
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise(async () => {
    const slackWebClient = getSlackWebClient();
    return await slackWebClient.emoji.list();
  });

  const emojis = Object.entries(data?.emoji ?? {});
  const allEmojiNames = emojis.map(([name]) => name).join(", ");

  const filteredEmojis = useMemo(() => {
    if (!searchText) return emojis;
    return emojis.filter(([name]) => name.toLowerCase().includes(searchText.toLowerCase()));
  }, [searchText, emojis]);

  const executeAISearch = environment.canAccess(AI) && searchText.length > 0 && filteredEmojis.length === 0;
  const prompt = `Here is a list of all available emoji names: ${allEmojiNames}\nReturn the emoji names in the list, separated by commas and with no additional text, that best match the semantic meaning of the following description: ${searchText}\nYou should return at least one emoji name.`;
  const { data: modelResponse, isLoading: isAILoading } = useAI(prompt, {
    model: AI.Model["OpenAI_GPT4o-mini"],
    execute: executeAISearch,
  });

  const aiEmojiEntries = useMemo(() => {
    return modelResponse
      .split(",")
      .map((name) => name.trim())
      .filter((name) => !!data?.emoji?.[name])
      .map((name) => [name, data?.emoji?.[name]]) as Array<[string, string]>;
  }, [modelResponse, data]);

  const emojiEntries = useMemo(() => {
    if (!searchText) return emojis;
    if (executeAISearch) return aiEmojiEntries;
    return filteredEmojis;
  }, [searchText, filteredEmojis, aiEmojiEntries]);

  return (
    <Grid
      isLoading={isLoading || isAILoading}
      columns={8}
      inset={Grid.Inset.Medium}
      onSearchTextChange={setSearchText}
      throttle
    >
      {emojiEntries.map(([name, url]) => (
        <EmojiItem key={name} name={name} url={url} />
      ))}

      <Grid.EmptyView title={isAILoading ? "Searching Slack emojis with AI…" : "No emojis found"} />
    </Grid>
  );
}

export default withSlackClient(Command);
