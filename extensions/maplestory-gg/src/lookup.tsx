import { useState } from "react";
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { CharacterDetail } from "./components.js";
import { CharacterNotFoundError, getFavoriteCharacter, lookupCharacter } from "./utils.js";

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [characterName, setCharacterName] = useState("");
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.MagnifyingGlass}
            title="Lookup Character"
            onSubmit={async (values) => {
              const region = values.region;
              const characterName = values.characterName.trim();
              if (!characterName) {
                setError("Enter a character name");
                return;
              }
              setIsLoading(true);
              try {
                const cached = await getFavoriteCharacter(region, characterName);
                const character = cached ?? (await lookupCharacter(region, characterName));
                setError(undefined);
                push(<CharacterDetail checkLatest={Boolean(cached)} characterData={character} />);
              } catch (error) {
                setError(
                  error instanceof CharacterNotFoundError ? error.message : "Failed to look up character. Try again.",
                );
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="region" title="Region" defaultValue="gms">
        <Form.Dropdown.Item value="gms" title="North America (GMS)" />
        <Form.Dropdown.Item value="ems" title="Europe (GMS)" />
      </Form.Dropdown>
      <Form.TextField
        autoFocus
        id="characterName"
        title="Character Name"
        placeholder="Enter character name"
        value={characterName}
        error={error}
        onChange={(value) => {
          setCharacterName(value);
          setError(undefined);
        }}
      />
    </Form>
  );
}
