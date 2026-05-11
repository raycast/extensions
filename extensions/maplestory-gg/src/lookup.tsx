import { useState } from "react";
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { HTTPError } from "got";
import { CharacterDetail } from "./components.js";
import { getFavoriteCharacter, lookupCharacter } from "./utils.js";

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
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
              const { region, characterName } = values;
              setIsLoading(true);
              const characterInLocalStorage = await getFavoriteCharacter(region, characterName);
              const character =
                characterInLocalStorage ??
                (await lookupCharacter(region, characterName).catch((error) => {
                  if (error instanceof HTTPError && error.response.statusCode === 404) {
                    setError(`Character not found`);
                  } else {
                    setError(`Failed to lookup character`);
                  }
                }));
              setIsLoading(false);
              if (character) {
                setError("");
                push(<CharacterDetail checkLatest={Boolean(characterInLocalStorage)} characterData={character} />);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="region" title="Region" defaultValue="gms">
        <Form.Dropdown.Item value="gms" title="Global (GMS)" />
        <Form.Dropdown.Item value="ems" title="Europe (EMS)" />
      </Form.Dropdown>
      <Form.TextField
        autoFocus
        id="characterName"
        title="Character Name"
        placeholder="Enter character name"
        error={error}
        onChange={() => setError("")}
      />
    </Form>
  );
}
