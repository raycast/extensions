import { ActionPanel, List, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import Parser from "rss-parser";
import getStories from "./arsTechnica";

export default function Command() {
  const { data, isLoading } = useCachedPromise(getStories);

  return (
    <List isLoading={isLoading}>
      {data?.map((item, index) => <StoryListItem key={item.guid} item={item} index={index} />)}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  const { item } = props;
  return <List.Item title={item.title as string} subtitle={item.creator} actions={<Actions item={item} />} />;
}

function Actions(props: { item: Parser.Item }) {
  const { title, link } = props.item;
  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        {link && (
          <>
            <Action.OpenInBrowser url={link} />
            <Action.CopyToClipboard content={link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
