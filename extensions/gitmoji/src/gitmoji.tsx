import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { gitmojis } from "gitmojis";

interface PreferenceValues {
  copy: "emoji" | "code";
}

type Gitmoji = {
  emoji: string;
  entity: string;
  code: string;
  description: string;
  name: string;
};

const GitmojiList = () => {
  return (
    <List searchBarPlaceholder="Search your gitmoji...">
      {gitmojis.map((gitmoji) => (
        <GitmojiListItem key={gitmoji.name} gitmoji={gitmoji} />
      ))}
    </List>
  );
};

const GitmojiListItem = (props: { gitmoji: Gitmoji }) => {
  const gitmoji = props.gitmoji;
  const { copy } = getPreferenceValues<PreferenceValues>();

  return (
    <List.Item
      id={gitmoji.name}
      key={gitmoji.name}
      title={gitmoji.description}
      icon={gitmoji.emoji}
      accessoryTitle={gitmoji.code}
      keywords={[gitmoji.code.replace(":", ""), gitmoji.name]}
      actions={
        <ActionPanel>
          <Action.Paste content={gitmoji[copy]} />
          <Action.CopyToClipboard content={gitmoji[copy]} />
        </ActionPanel>
      }
    />
  );
};

export default GitmojiList;
