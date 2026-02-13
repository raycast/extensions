import { Action, ActionPanel, Grid } from "@raycast/api";
import { CharacterDetail } from "./components/CharacterDetail";
import { CHARACTERS } from "./data/characters";
import { getCharacterKeywords } from "./utils/search";

export default function SearchCharactersCommand() {
  return (
    <Grid searchBarPlaceholder="Search by EN / JP / romanized / keyword..." columns={5} fit={Grid.Fit.Fill}>
      {CHARACTERS.map((character) => (
        <Grid.Item
          key={character.id}
          content={character.icon}
          title={character.nameEn}
          subtitle={character.nameJp}
          keywords={getCharacterKeywords(character)}
          actions={
            <ActionPanel>
              <Action.Push title="Open Character Detail" target={<CharacterDetail character={character} />} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
