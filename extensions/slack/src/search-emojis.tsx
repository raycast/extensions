import { useCallback, useMemo, useState } from "react";
import { Action, ActionPanel, Grid, Icon, AI, environment } from "@raycast/api";
import { useAI, useCachedPromise } from "@raycast/utils";
import { withSlackClient } from "./shared/withSlackClient";
import { SlackClient } from "./shared/client";
import { useEmojiRanking, type EmojiEntry } from "./shared/useEmojiRanking";

const DISPLAY_LIMIT = 1000;

function EmojiItem({
  name,
  url,
  onUse,
  onResetRanking,
}: {
  name: string;
  url: string;
  onUse: () => void;
  onResetRanking: () => void;
}) {
  return (
    <Grid.Item
      content={url}
      title={name}
      actions={
        <ActionPanel>
          <Action.Paste content={name} onPaste={onUse} />
          <Action.CopyToClipboard content={name} onCopy={onUse} />
          <ActionPanel.Section>
            <Action icon={Icon.ArrowCounterClockwise} title="Reset Ranking" onAction={onResetRanking} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Command() {
  const [searchText, setSearchText] = useState("");
  const [displayLimit, setDisplayLimit] = useState(DISPLAY_LIMIT);

  const { data, isLoading } = useCachedPromise(SlackClient.getWorkspaceEmojis);

  const emojis = useMemo(() => Object.entries(data ?? {}) as EmojiEntry[], [data]);

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
      .map((name) => [name, data?.[name]]) as EmojiEntry[];
  }, [modelResponse, data]);

  const emojiEntries = useMemo(() => {
    if (!searchText) return emojis;
    if (executeAISearch) return aiEmojiEntries;
    return filteredEmojis;
  }, [searchText, emojis, filteredEmojis, aiEmojiEntries, executeAISearch]);

  const { entries: rankedEmojis, visitItem, resetRanking } = useEmojiRanking(emojiEntries);

  // Not memoized on purpose: the ranked array may keep its reference when the ranking changes.
  const visibleEmojis = rankedEmojis.slice(0, displayLimit);
  const hiddenCount = rankedEmojis.length - visibleEmojis.length;

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
      {visibleEmojis.map((entry) => (
        <EmojiItem
          key={entry[0]}
          name={entry[0]}
          url={entry[1]}
          onUse={() => visitItem(entry)}
          onResetRanking={() => resetRanking(entry)}
        />
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
