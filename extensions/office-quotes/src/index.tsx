import { ActionPanel, Action, List, Icon, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";
import { DescriptionPane } from "./DescriptionPane";
import { shuffle } from "./shuffle";

export default function main() {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    if (quotes.length === 0) {
      axios
        .get("https://officeapi.dev/api/quotes/")
        .then((res) => {
          const shuffledQuotes: any = shuffle(res.data.data);
          setQuotes(shuffledQuotes);
        })
        .then(() => setLoading(false))
        .catch((err) => {
          showToast(Toast.Style.Failure, "Failed to load quotes", err.message).then((err) => console.log(err));
        });
    }
  }, []);

  return (
    <List isLoading={loading}>
      {quotes?.length > 0 &&
        quotes.map((quote, index) => (
          <List.Item
            title={quote["content"]}
            key={quote["content"]}
            accessories={[
              { text: `${quote["character"]["firstname"]} ${quote["character"]["lastname"]}` },
              { icon: Icon.Person },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={quote["content"]} shortcut={{ modifiers: ["cmd"], key: "." }} />
                <ActionPanel.Section>
                  {quote && (
                    <Action.Push
                      title="View Details"
                      icon={Icon.Text}
                      target={<DescriptionPane quotes={quotes} quote={quote} index={index} />}
                      shortcut={{ modifiers: ["cmd"], key: "," }}
                    />
                  )}
                  <Action
                    title="Shuffle Quotes"
                    icon={Icon.TwoArrowsClockwise}
                    onAction={() => {
                      setLoading(true);
                      const newlyShuffledQuotes: any = shuffle(quotes);
                      setQuotes(newlyShuffledQuotes);
                      setLoading(false);
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
