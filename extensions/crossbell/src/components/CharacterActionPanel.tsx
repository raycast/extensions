import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import type { CharacterEntity } from "crossbell";
import { extractCharacterInfo } from "../utils/character";
import { composeCharacterUrl } from "../utils/url";
import CharacterDetail from "./CharacterDetail";
import CharacterNoteList from "./CharacterNoteList";
import IpfsDetail from "./IpfsDetail";

export default function CharacterActionPanel({
  character,
  enableShowDetail = false,
}: {
  character: CharacterEntity;
  enableShowDetail?: boolean;
}) {
  const { handle } = extractCharacterInfo(character);

  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {enableShowDetail && (
          <Action
            title="Show Detail"
            onAction={() => push(<CharacterDetail character={character} />)}
            icon={Icon.Document}
          />
        )}
        <Action
          title="Show Notes"
          onAction={() => push(<CharacterNoteList characterId={character.characterId} />)}
          icon={Icon.Book}
        />
        {character.metadata?.uri && (
          <Action
            title="Show IPFS Metadata"
            onAction={() => push(<IpfsDetail ipfsLink={character.metadata?.uri} />)}
            icon={Icon.Document}
          />
        )}
        <Action.OpenInBrowser title="Open in Browser" url={composeCharacterUrl(handle)} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Handle" content={handle} shortcut={{ modifiers: ["cmd"], key: "." }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
