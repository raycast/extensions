import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { CharacterComparisonDetail } from "./components/CharacterComparisonDetail";
import { CHARACTERS, CATEGORY_LABELS } from "./data/characters";

const DEFAULT_LEFT_ID = CHARACTERS[0]?.id ?? "";
const DEFAULT_RIGHT_ID = CHARACTERS[1]?.id ?? CHARACTERS[0]?.id ?? "";

function getFallbackCharacterId(excludingId: string): string {
  return CHARACTERS.find((character) => character.id !== excludingId)?.id ?? excludingId;
}

export default function CompareCharactersCommand() {
  const [leftId, setLeftId] = useState(DEFAULT_LEFT_ID);
  const [rightId, setRightId] = useState(DEFAULT_RIGHT_ID);

  const byId = useMemo(() => new Map(CHARACTERS.map((character) => [character.id, character])), []);
  const leftCharacter = byId.get(leftId) ?? CHARACTERS[0];
  const rightCharacter = byId.get(rightId) ?? CHARACTERS[1] ?? CHARACTERS[0];

  const handleLeftChange = (nextId: string) => {
    setLeftId(nextId);
    if (nextId === rightId) {
      setRightId(getFallbackCharacterId(nextId));
    }
  };

  const handleRightChange = (nextId: string) => {
    setRightId(nextId);
    if (nextId === leftId) {
      setLeftId(getFallbackCharacterId(nextId));
    }
  };

  const swapCharacters = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

  return (
    <Form
      navigationTitle="Compare Characters"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Sidebar}
              title="Compare Side by Side"
              target={<CharacterComparisonDetail leftCharacter={leftCharacter} rightCharacter={rightCharacter} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Selection">
            <Action icon={Icon.ArrowClockwise} title="Swap Characters" onAction={swapCharacters} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Pick any two characters to compare personality, relationships, and fun facts in one detail view." />
      <Form.Dropdown id="leftCharacter" title="Left Character" value={leftId} onChange={handleLeftChange}>
        {CHARACTERS.map((character) => (
          <Form.Dropdown.Item
            key={character.id}
            value={character.id}
            title={character.nameEn}
            icon={character.icon}
            keywords={[character.nameJp, CATEGORY_LABELS[character.category]]}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="rightCharacter" title="Right Character" value={rightId} onChange={handleRightChange}>
        {CHARACTERS.map((character) => (
          <Form.Dropdown.Item
            key={character.id}
            value={character.id}
            title={character.nameEn}
            icon={character.icon}
            keywords={[character.nameJp, CATEGORY_LABELS[character.category]]}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
