import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { DICTIONARY } from "./dictionary";

type NATO = {
  id: string;
  title: string;
  telephony: string;
  pronunciation: string;
};

const ITEMS: NATO[] = Object.keys(DICTIONARY).map((character) => {
  return {
    id: character,
    title: character,
    telephony: DICTIONARY[character][0],
    pronunciation: DICTIONARY[character][1],
  };
});

export default function Command() {
  return (
    <List>
      {ITEMS.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.telephony}
          accessories={[{ icon: Icon.SpeechBubbleActive, text: item.pronunciation }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.telephony} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
