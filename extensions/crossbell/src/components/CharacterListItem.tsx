import { List } from "@raycast/api";
import type { CharacterEntity } from "crossbell";
import { extractCharacterInfo } from "../utils/character";
import CharacterActionPanel from "./CharacterActionPanel";

export default function CharacterListItem({ character }: { character: CharacterEntity }) {
  const { username, bio, handle, avatar } = extractCharacterInfo(character);

  return (
    <List.Item
      title={username}
      subtitle={bio}
      accessories={[{ text: `@${handle}` }]}
      icon={{ source: avatar ? avatar : "no-view.png", fallback: "no-view.png" }}
      actions={<CharacterActionPanel character={character} enableShowDetail />}
    />
  );
}
