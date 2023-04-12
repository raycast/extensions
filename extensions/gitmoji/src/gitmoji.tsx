import { Action, ActionPanel, List, getPreferenceValues, Color } from "@raycast/api";
import { gitmojis as defaultGitmojis } from "gitmojis";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

interface PreferenceValues {
  copy: "emoji" | "code" | "description-emoji" | "description-code";
  action: "paste" | "copy";
}

type Gitmoji = {
  emoji: string;
  entity: string;
  code: string;
  description: string;
  name: string;
};

const GitmojiList = () => {
  const [gitmojis, setGitmojis] = useState<Gitmoji[]>(defaultGitmojis);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchGitmojis() {
      setIsLoading(true);
      try {
        const response = await fetch("https://gitmoji.dev/api/gitmojis");
        if (response.status == 200) {
          const json = await response.json();
          setGitmojis((json as Record<string, Gitmoji[]>).gitmojis);
        } else {
          setGitmojis(defaultGitmojis);
        }
        setIsLoading(false);
      } catch {
        setGitmojis(defaultGitmojis);
        setIsLoading(false);
      }
    }

    fetchGitmojis();
  }, []);

  return (
    <List searchBarPlaceholder="Search your gitmoji..." isLoading={isLoading}>
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
      accessories={[{ tag: { value: gitmoji.code, color: Color.Yellow } }]}
      keywords={[gitmoji.code.replace(":", ""), gitmoji.name]}
      actions={
        <ActionPanel>
          {copy === "emoji" && <PrimaryAction content={gitmoji.emoji} />}
          {copy === "code" && <PrimaryAction content={gitmoji.code} />}
          {copy === "description-emoji" && <PrimaryAction content={`${gitmoji.emoji} ${gitmoji.description}`} />}
          {copy === "description-code" && <PrimaryAction content={`${gitmoji.code} ${gitmoji.description}`} />}

          <ActionPanel.Section>
            <Action.CopyToClipboard content={gitmoji.emoji} title="Copy Emoji" />
            <Action.CopyToClipboard content={gitmoji.code} title="Copy Code" />
            <Action.CopyToClipboard
              content={`${gitmoji.emoji} ${gitmoji.description}`}
              title="Copy Emoji + Description"
            />
            <Action.CopyToClipboard
              content={`${gitmoji.code} ${gitmoji.description}`}
              title="Copy Code + Description"
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Paste content={gitmoji.emoji} title="Paste Emoji" />
            <Action.Paste content={gitmoji.code} title="Paste Code" />
            <Action.Paste content={`${gitmoji.emoji} ${gitmoji.description}`} title="Paste Emoji + Description" />
            <Action.Paste content={`${gitmoji.code} ${gitmoji.description}`} title="Paste Code + Description" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

function PrimaryAction(props: { content: string }) {
  const { action } = getPreferenceValues<PreferenceValues>();
  if (action === "copy") {
    return <Action.CopyToClipboard content={props.content} shortcut={{ modifiers: ["cmd"], key: "c" }} />;
  } else {
    return <Action.Paste content={props.content} shortcut={{ modifiers: ["cmd"], key: "p" }} />;
  }
}

export default GitmojiList;
