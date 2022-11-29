import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { gitmojis as defaultGitmojis } from "gitmojis";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

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
