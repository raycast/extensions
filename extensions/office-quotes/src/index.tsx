import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { DescriptionPane } from "./DescriptionPane";
import { shuffle } from "./shuffle";
import { Quote } from "./types";
import rawQuotes from "./data/quotes.json";

export default function main() {
  const [isLoading, setIsLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    function initialShuffle() {
      setIsLoading(true);
      setQuotes(shuffle(rawQuotes));
      setIsLoading(false);
    }
    initialShuffle();
  }, []);

  return (
    <List isLoading={isLoading}>
      {quotes.map((quote, index) => (
        <List.Item
          title={quote.content}
          key={quote.content}
          accessories={[{ text: quote.character }, { icon: Icon.Person }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={quote.content} shortcut={{ modifiers: ["cmd"], key: "." }} />
              <Action.Push
                title="View Details"
                icon={Icon.Text}
                target={<DescriptionPane quote={quote} quotes={quotes} index={index} />}
              />
              <ActionPanel.Section>
                <Action
                  title="Shuffle Quotes"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setIsLoading(true);
                    const newlyShuffledQuotes = shuffle(quotes);
                    setQuotes(newlyShuffledQuotes);
                    setIsLoading(false);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "/" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
