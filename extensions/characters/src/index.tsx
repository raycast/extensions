import { useEffect, useState } from "react";
import { LocalStorage, List, Icon, ActionPanel, Action, useNavigation, Form } from "@raycast/api";
import { Character } from "./types";

let dummyFed = false;

const dummy = [
  { description: "euro", character: "€" },
  { description: "square meter", character: "m²" },
  { description: "cubic meter", character: "m³" },
  { description: "copywrite", character: "©" },
];

export default function Command() {
  const [characters, setCharacters] = useState<Character[] | []>([]);
  // Only run if there's no local storage data
  useEffect(() => {
    const feedDummy = async () => {
      const data = await LocalStorage.getItem("characters");
      if (!data) {
        const dum = JSON.stringify(dummy);
        await LocalStorage.setItem("characters", dum);
        console.log("feedDummy");
      }
      dummyFed = true;
    };
    if (!dummyFed) {
      feedDummy();
    }
  }, []);

  // Get all characters & set as state
  useEffect(() => {
    const fetchData = async () => {
      const data = await LocalStorage.getItem<string>("characters");
      if (!data) return;
      const results = JSON.parse(data);
      setCharacters(results);
    };
    fetchData().catch(console.error);
  }, []);

  async function handleDelete(index: number) {
    const newCharacters = [...characters];
    newCharacters.splice(index, 1);
    const Json = JSON.stringify(newCharacters);
    await LocalStorage.setItem("characters", Json);
    setCharacters(newCharacters);
  }

  async function handleCreate(character: Character) {
    const newCharacters = [...characters, character];
    const Json = JSON.stringify(newCharacters);
    await LocalStorage.setItem("characters", Json);
    setCharacters(newCharacters);
  }

  return (
    <List>
      {characters.length > 0 ? (
        characters.map((i, index) => (
          <List.Item
            key={index}
            title={i.description}
            accessories={[{ text: i.character }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={i.character} />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Add Character"
                  shortcut={{ modifiers: ["ctrl"], key: "n" }}
                  target={<CreateCharacterForm onCreate={(Character) => handleCreate(Character)} />}
                />
                <DeleteCharacter onDelete={() => handleDelete(index)} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No characters found" icon={Icon.MagnifyingGlass} />
      )}
    </List>
  );
}

function DeleteCharacter(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Remove Character"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}
        
function CreateCharacterForm(props: { onCreate: (character: Character) => void }) {
  const { onCreate } = props;
  const { pop } = useNavigation();

  function handleSubmit(values: { character: string; description: string }) {
    onCreate({ character: values.character, description: values.description });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Character" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="character" title="Character" />
      <Form.TextField id="description" title="Description" />
    </Form>
  );
}
