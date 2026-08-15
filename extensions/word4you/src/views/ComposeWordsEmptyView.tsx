import { Detail, ActionPanel, Action, Icon } from "@raycast/api";

interface ComposeWordsEmptyViewProps {
  singleWordsCount: number;
}

export function ComposeWordsEmptyView({ singleWordsCount }: ComposeWordsEmptyViewProps) {
  return (
    <Detail
      markdown={`# Not Enough Words

You need at least **2 saved words** to compose sentences.

Currently you have **${singleWordsCount}** saved word(s) (excluding composed sentences).

Please use the **Learn Word** command to save more words to your vocabulary notebook first.`}
      actions={
        <ActionPanel>
          <Action.Push title="Learn Words" icon={Icon.Book} target={<Detail markdown="Use the Learn Word command" />} />
        </ActionPanel>
      }
    />
  );
}
