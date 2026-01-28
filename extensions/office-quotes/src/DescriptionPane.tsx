import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Quote } from "./types";
import avatars from "./data/avatars.json";

interface Props {
  quote: Quote;
  quotes: Quote[];
  index: number;
}

export function DescriptionPane({ quote, quotes, index }: Props) {
  const markdown = `
${quote.content}

- ${quote.character}

Season: ${quote.season || "N/A"} / Episode: ${quote.episode || "N/A"}

![Illustration](${avatars.find((avatar) => avatar.character === quote.character)?.character_avatar_url})`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${quote.character}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {quote && (
              <Action.Push
                icon={Icon.ArrowRight}
                title="Next Quote"
                target={<DescriptionPane index={index + 1} quotes={quotes} quote={quotes[index + 1]} />}
              />
            )}
          </ActionPanel.Section>
          <Action.CopyToClipboard content={quote.content} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    />
  );
}
