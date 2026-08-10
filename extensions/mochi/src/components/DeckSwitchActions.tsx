import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { Deck } from "../types";

type Props = {
  onSubmit: (val: string) => void;
  decks: Deck[];
};

const DeckSwitchActions = ({ decks, onSubmit }: Props) => {
  const Actions = decks.slice(0, 5).map((deck, i) => {
    return (
      <Action.SubmitForm
        onSubmit={() => onSubmit(deck.id)}
        key={deck.id}
        icon={Icon.Switch}
        title={deck.name}
        shortcut={{ modifiers: ["cmd"], key: `${i + 1}` as Keyboard.KeyEquivalent }}
      />
    );
  });

  return <ActionPanel.Section title="Switch Deck">{Actions}</ActionPanel.Section>;
};

export default DeckSwitchActions;
