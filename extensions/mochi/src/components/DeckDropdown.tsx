import { Form } from "@raycast/api";
import { Deck } from "../types";

type Props = {
  deckId: string;
  decks: Deck[];
  onChange: (val: string) => void;
};

const DeckDropDown = ({ deckId, decks, onChange }: Props) => {
  return (
    <Form.Dropdown id="dropdown" title="📚 Deck" onChange={onChange} value={deckId} autoFocus={false} throttle>
      {decks.map((deck) => (
        <Form.Dropdown.Item key={deck.id} value={deck.id} title={deck.name} />
      ))}
    </Form.Dropdown>
  );
};

export default DeckDropDown;
