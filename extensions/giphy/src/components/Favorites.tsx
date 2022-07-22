import { Grid } from "@raycast/api";
import { useApp } from "../hooks/useApp";
import { normalizeTitle } from "../utils/giphy";
import GIFActions from "./GIFActions";

function Favorites() {
  const { favs, searchText } = useApp();
  return (
    <Grid.Section title="Favorites">
      {Object.values(favs)
        .reverse()
        .filter((item) => item.title.startsWith(searchText))
        .map((recentItem) => (
          <Grid.Item
            key={recentItem.id}
            content={{
              value: { source: recentItem.images.preview_gif.url },
              tooltip: recentItem.title,
            }}
            title={normalizeTitle(recentItem.title)}
            subtitle={recentItem.username}
            actions={<GIFActions gif={recentItem} />}
          />
        ))}
    </Grid.Section>
  );
}

export default Favorites;
