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
          <ActionPanel.Section>
            <Action.Push
              title="Open Character Detail"
              icon={Icon.Eye}
              target={<CharacterDetail character={character} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Japanese Name" icon={Icon.Clipboard} content={character.nameJp} />
            <Action.CopyToClipboard title="Copy Character Bio" icon={Icon.Text} content={character.description} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser title="Open Official Page" icon={Icon.Globe} url={character.officialUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
