import { Action, ActionPanel, Detail } from "@raycast/api";

interface Props {
  quote: any;
  quotes: never[];
  index: number;
}

export function DescriptionPane({ quote, quotes, index }: Props) {
  const markdown = `
${quote?.content}

- ${quote?.character?.firstname} ${quote?.character?.lastname}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${quote?.character?.firstname} ${quote?.character?.lastname}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {quote && (
              <Action.Push
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
