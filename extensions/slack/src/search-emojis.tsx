import { useCallback, useMemo, useState } from "react";
import { Action, ActionPanel, Grid, Icon, AI, environment } from "@raycast/api";
import { useAI, useCachedPromise } from "@raycast/utils";
import { withSlackClient } from "./shared/withSlackClient";
import { SlackClient } from "./shared/client";

const DISPLAY_LIMIT = 1000;

function EmojiItem({ name, url }: { name: string; url: string }) {
  return (
    <Grid.Item
      content={url}
      title={name}
      actions={
        <ActionPanel>
          <Action.Paste content={name} />
          <Action.CopyToClipboard content={name} />
        </ActionPanel>
      }
    />
  );
}

function Command() {
  const [searchText, setSearchText] = useState("");
  const [displayLimit, setDisplayLimit] = useState(DISPLAY_LIMIT);

  const { data, isLoading } = useCachedPromise(SlackClient.getWorkspaceEmojis);

  const emojis = useMemo(() => Object.entries(data ?? {}), [data]);

  const filteredEmojis = useMemo(() => {
    if (!searchText) return emojis;
    return emojis.filter(([name]) => name.toLowerCase().includes(searchText.toLowerCase()));
  }, [searchText, emojis]);

  const executeAISearch = environment.canAccess(AI) && searchText.length > 0 && filteredEmojis.length === 0;
  const allEmojiNames = useMemo(() => emojis.map(([name]) => name).join(", "), [emojis]);
  const prompt = `Here is a list of all available emoji names: ${allEmojiNames}\nReturn the emoji names in the list, separated by commas and with no additional text, that best match the semantic meaning of the following description: ${searchText}\nYou should return at least one emoji name.`;
  const { data: modelResponse, isLoading: isAILoading } = useAI(prompt, {
    model: AI.Model["OpenAI_GPT4o-mini"],
    execute: executeAISearch,
  });

  const aiEmojiEntries = useMemo(() => {
    return modelResponse
      .split(",")
      .map((name) => name.trim())
      .filter((name) => !!data?.[name])
      .map((name) => [name, data?.[name]]) as Array<[string, string]>;
  }, [modelResponse, data]);

  const emojiEntries = useMemo(() => {
    if (!searchText) return emojis;
    if (executeAISearch) return aiEmojiEntries;
    return filteredEmojis;
  }, [searchText, emojis, filteredEmojis, aiEmojiEntries, executeAISearch]);

  const visibleEmojis = useMemo(() => emojiEntries.slice(0, displayLimit), [emojiEntries, displayLimit]);
  const hiddenCount = emojiEntries.length - visibleEmojis.length;

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    setDisplayLimit(DISPLAY_LIMIT);
  }, []);

  return (
    <Grid
      isLoading={isLoading || isAILoading}
      columns={8}
      inset={Grid.Inset.Medium}
      onSearchTextChange={handleSearchTextChange}
      throttle
    >
      {visibleEmojis.map(([name, url]) => (
        <EmojiItem key={name} name={name} url={url} />
      ))}

      {hiddenCount > 0 && (
        <Grid.Item
          content={Icon.Ellipsis}
          title="Show More"
          subtitle={`${hiddenCount} more`}
          actions={
            <ActionPanel>
              <Action title="Show More" onAction={() => setDisplayLimit((limit) => limit + DISPLAY_LIMIT)} />
            </ActionPanel>
          }
        />
      )}

      <Grid.EmptyView title={isAILoading ? "Searching Slack emojis with AI…" : "No emojis found"} />
    </Grid>
  );
}

export default withSlackClient(Command);
