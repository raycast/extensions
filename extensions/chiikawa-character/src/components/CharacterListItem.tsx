import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { CATEGORY_LABELS } from "../data/characters";
import { ChiikawaCharacter } from "../types/character";
import { getCharacterKeywords } from "../utils/search";
import { CharacterDetail } from "./CharacterDetail";

interface Props {
  character: ChiikawaCharacter;
}

export function CharacterListItem({ character }: Props) {
  return (
    <List.Item
      icon={character.icon}
      title={character.nameEn}
      subtitle={character.nameJp}
      keywords={getCharacterKeywords(character)}
      accessories={[{ text: CATEGORY_LABELS[character.category], icon: Icon.Tag }]}
      actions={
        <ActionPanel>
          <Action.Push title="Open Character Detail" target={<CharacterDetail character={character} />} />
          <Action.CopyToClipboard title="Copy Japanese Name" content={character.nameJp} />
          <Action.CopyToClipboard title="Copy Character Bio" content={character.description} />
          <Action.OpenInBrowser title="Open Official Page" url={character.officialUrl} />
        </ActionPanel>
      }
    />
  );
}
