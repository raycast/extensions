import { List } from "@raycast/api";
import type { Character } from "../types.d";

type CharacterProps = {
  character: Character;
};

export default function CharacterDetail({ character }: CharacterProps) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={character.name} />
          <List.Item.Detail.Metadata.Label title="Birthday" text={character.birthday} />

          {character.loves.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Loves">
                {character.loves.map((gift) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={gift.name}
                    icon={{ source: gift.image }}
                    text={gift.name}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}

          {character.likes.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Likes">
                {character.likes.map((gift) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={gift.name}
                    icon={{ source: gift.image }}
                    text={gift.name}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}

          {character.dislikes.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Dislikes">
                {character.dislikes.map((gift) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={gift.name}
                    icon={{ source: gift.image }}
                    text={gift.name}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}

          {character.hates.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Hates">
                {character.hates.map((gift) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={gift.name}
                    icon={{ source: gift.image }}
                    text={gift.name}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
