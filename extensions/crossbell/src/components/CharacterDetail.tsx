import { Detail } from "@raycast/api";
import type { CharacterEntity } from "crossbell";
import { useCharacter } from "../apis";
import { extractCharacterInfo } from "../utils/character";
import { composeCharacterUrl } from "../utils/url";
import CharacterActionPanel from "./CharacterActionPanel";

export default function CharacterDetail({
  character: initialCharacter,
  characterId,
}: {
  character?: CharacterEntity;
  characterId?: number;
}) {
  const { data } = useCharacter(characterId);
  const character = data ?? initialCharacter;
  const { handle, username, avatar, bio } = extractCharacterInfo(character);

  const markdown = `# ${username ?? handle}

![avatar](${avatar})

${bio ?? ""}
  `;

  return (
    <Detail
      isLoading={!character}
      markdown={markdown}
      navigationTitle={username ?? handle}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Username" text={username ?? handle} />
          <Detail.Metadata.Label title="Handle" text={`@${handle}`} />
          <Detail.Metadata.Label title="Bio" text={bio} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Character Page" target={composeCharacterUrl(handle)} text={`@${handle}`} />
        </Detail.Metadata>
      }
      actions={character && <CharacterActionPanel character={character} />}
    />
  );
}
