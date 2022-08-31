import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { FC } from "react";
import { getSaurusUrl } from "../helpers/thesaurus";
import { iWord } from "../types";

interface iWordListProps {
  title?: string;
  subtitle?: string;
  words: iWord[];
}

const getColor = (similarity: number) => {
  if (similarity < 0) return undefined;
  if (similarity <= 25) return "rgb(255, 182, 0)";
  if (similarity <= 50) return "rgb(255, 145, 0)";
  return "rgb(244, 71, 37)";
};
const WordList: FC<iWordListProps> = ({ words, title, subtitle }) => {
  return (
    <List.Section title={title} subtitle={subtitle}>
      {words.map((word) => {
        const accessories = [{ text: word.isInformal ? "Informal" : "Formal" }];

        if (word.similarity >= 0) accessories.unshift({ text: `Similarity: ${word.similarity}%` });
        return (
          <List.Item
            title={word.term}
            subtitle={word.definition}
            accessories={accessories}
            icon={{
              tooltip: `Similarity: ${word.similarity} %`,
              source: Icon.Dot, //getProgressIcon(word.similarity / 100),
              tintColor: getColor(word.similarity),
            }}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Synonym">
                  <Action.CopyToClipboard content={word.term} />
                  <Action.OpenInBrowser title="Open in Thesaurus" url={getSaurusUrl(word.term)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
};

export default WordList;
