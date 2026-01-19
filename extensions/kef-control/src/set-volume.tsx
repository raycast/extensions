import { List } from "@raycast/api";
import { useFavorite } from "./hooks/use-favorite";
import { VolumeItem } from "./components/volume-item";
import { groupBy } from "./utils/group-by";

const ITEMS = Array.from({ length: 21 }, (_, i) => i * 5);

export default function Command() {
  const { hasFavorites, isFavorite } = useFavorite("volume");

  const items = groupBy(ITEMS, (item) => (isFavorite(item) ? "FAVORITE" : "OTHER"));

  return (
    <List>
      {hasFavorites && (
        <List.Section title="Favorites">
          {items.FAVORITE.map((item) => (
            <VolumeItem key={item} value={item} />
          ))}
        </List.Section>
      )}
      <List.Section title="Volumes">
        {items.OTHER.map((item) => (
          <VolumeItem key={item} value={item} />
        ))}
      </List.Section>
    </List>
  );
}
