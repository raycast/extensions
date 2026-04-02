import { useState } from "react";
import { getPreferenceValues, Grid } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { getAllCharacters } from "@/lib/utils/lunaris";
import { WEAPON_TYPE } from "@/lib/constants";

import CharacterGridItem from "@/components/character/character-grid-item";

export default function Command() {
  const { isLoading, data: characters } = useCachedPromise(getAllCharacters);
  const [pinned, setPinned] = useCachedState<string[]>("pinned_characters", []);
  const preferences = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState<string>("All");

  return (
    <Grid
      columns={7}
      isLoading={isLoading}
      inset={Grid.Inset.Zero}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter characters" onChange={(newValue) => setFilter(newValue)}>
          <Grid.Dropdown.Item key={"All"} title={"All"} value={"All"} />
          <Grid.Dropdown.Section title="Elements">
            {["Pyro", "Hydro", "Electro", "Cryo", "Anemo", "Geo", "Dendro"].map((type) => (
              <Grid.Dropdown.Item key={type} title={type} value={type} icon={`elements/${type.toLowerCase()}.png`} />
            ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Weapons">
            {Object.keys(WEAPON_TYPE).map((type) => {
              const key = type as keyof typeof WEAPON_TYPE;
              return <Grid.Dropdown.Item key={key} title={WEAPON_TYPE[key]} value={key} icon={`weapons/${type}.png`} />;
            })}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.Section title="Pinned Characters">
        {characters &&
          Object.entries(characters)
            .reverse()
            .filter(([id]) => {
              return pinned.includes(id);
            })
            .map(([id, char]) => (
              <CharacterGridItem key={id} id={id} character={char} pinned={pinned} setPinned={setPinned} />
            ))}
      </Grid.Section>
      <Grid.Section title={pinned && pinned.length > 0 ? "All Characters" : undefined}>
        {characters &&
          Object.entries(characters)
            .reverse()
            .filter(([id, char]) => {
              const releaseTimeMs = char.releaseDate * 1000;

              const isAllowed =
                (preferences.allowUnreleased || releaseTimeMs <= Date.now()) &&
                !char.enName.startsWith("Manekin") &&
                char.enName !== "Traveler";

              const matchesFilter =
                !filter || filter === "All" || char.element === filter || char.weaponType === filter;

              return isAllowed && matchesFilter && !pinned.includes(id);
            })
            .map(([id, char]) => (
              <CharacterGridItem key={id} id={id} character={char} pinned={pinned} setPinned={setPinned} />
            ))}
      </Grid.Section>
    </Grid>
  );
}
