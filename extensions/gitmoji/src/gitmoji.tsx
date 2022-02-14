import { ActionPanel, CopyToClipboardAction, PasteAction, List, getPreferenceValues } from "@raycast/api";
import { gitmojis } from "gitmojis";

export default function GitmojiList() {
  return (
    <List searchBarPlaceholder="Search your gitmoji...">
      {gitmojis.map((gitmoji) => (
        <GitmojiListItem key={gitmoji.name} gitmoji={gitmoji} />
      ))}
    </List>
  );
}

function GitmojiListItem(props: { gitmoji: Gitmoji }) {
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
          <PasteAction content={gitmoji[copy]} />
          <CopyToClipboardAction content={gitmoji[copy]} />
        </ActionPanel>
      }
    />
  );
}

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
