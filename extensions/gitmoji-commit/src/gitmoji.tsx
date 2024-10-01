import { Action, ActionPanel, Clipboard, Color, getPreferenceValues, List } from "@raycast/api";
import { GitmojiListItemProps, PreferenceValues, gitmojis } from "./lib/types";

const GitmojiList = () => {
  return (
    <List searchBarPlaceholder="Search your gitmoji...">
      {gitmojis.map((gitmoji) => (
        <GitmojiListItem key={gitmoji.name} gitmoji={gitmoji} />
      ))}
    </List>
  );
};

const GitmojiListItem = ({ gitmoji }: GitmojiListItemProps) => {
  const { name, desc, emoji, code, type } = gitmoji;
  const { emojiFormat, copyFormat, terminator } = getPreferenceValues<PreferenceValues>();

  let emojiText = emojiFormat === "emoji" ? emoji : code;

  if (copyFormat === "emoji-type") {
    emojiText = `${emojiText} ${type}`;
  }

  return (
    <List.Item
      id={name}
      key={name}
      title={desc}
      icon={emoji}
      accessories={[{ tag: { value: code, color: Color.Yellow } }]}
      keywords={[code.replace(":", ""), name]}
      actions={
        <ActionPanel>
          <PrimaryAction content={`${emojiText}${terminator}`} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={emoji}
              title="Copy Emoji"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              content={code}
              title="Copy Code"
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              content={`${emoji} ${terminator}`}
              title="Copy Emoji with Terminator"
              shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              content={`${code} ${terminator}`}
              title="Copy Code with Terminator"
              shortcut={{ modifiers: ["ctrl", "opt"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Paste content={emoji} title="Paste Emoji" shortcut={{ modifiers: ["cmd", "shift"], key: "p" }} />
            <Action.Paste content={code} title="Paste Code" shortcut={{ modifiers: ["cmd", "opt"], key: "p" }} />
            <Action.Paste
              content={`${emoji} ${terminator}`}
              title="Paste Emoji with Terminator"
              shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
            />
            <Action.Paste
              content={`${code} ${terminator}`}
              title="Paste Code with Terminator"
              shortcut={{ modifiers: ["ctrl", "opt"], key: "p" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

interface PrimaryActionProps {
  content: string;
}

function PrimaryAction({ content }: PrimaryActionProps) {
  const { action } = getPreferenceValues<PreferenceValues>();

  if (action === "copy") {
    return <Action.CopyToClipboard content={content} />;
  } else if (action === "paste") {
    return <Action.Paste content={content} />;
  } else {
    Clipboard.copy(content);
    return <Action.Paste content={content} />;
  }
}
export default GitmojiList;
