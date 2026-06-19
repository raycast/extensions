import { Action, ActionPanel, Grid, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";

import { getCachedCard } from "@/lib/utils/character-card";
import { WEAPON_TYPE } from "@/lib/constants";

import SingleCharacter from "./single-character";

type Props = {
  id: string;
  character: GenshinCharacter;
  pinned: string[];
  setPinned: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function CharacterGridItem({ id, character, pinned, setPinned }: Props) {
  const [cardPath, setCardPath] = useState<string>("");
  const { push } = useNavigation();

  useEffect(() => {
    let isMounted = true;
    async function resolveImage() {
      const path = await getCachedCard(id, character);
      if (isMounted) setCardPath(path);
    }
    resolveImage();
    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <Grid.Item
      content={{ source: cardPath, tooltip: character.enName }}
      id={character.enName}
      keywords={[character.enName, id, character.element, WEAPON_TYPE[character.weaponType]]}
      actions={
        <ActionPanel>
          <Action
            title="Detailed Information"
            icon={Icon.Person}
            onAction={() => push(<SingleCharacter id={id} character={character} />)}
          />
          <Action
            title={pinned.includes(id) ? "Unpin Character" : "Pin Character"}
            icon={pinned.includes(id) ? Icon.PinDisabled : Icon.Pin}
            style={pinned.includes(id) ? Action.Style.Destructive : Action.Style.Regular}
            onAction={() => {
              setPinned(
                (prev) =>
                  prev.includes(id)
                    ? prev.filter((item) => item !== id) // Remove
                    : [...prev, id], // Add
              );
            }}
          />
          <Action.OpenInBrowser
            url={`https://lunaris.moe/character/${id}`}
            shortcut={{ modifiers: ["alt"], key: "enter" }}
          />
        </ActionPanel>
      }
    />
  );
}
