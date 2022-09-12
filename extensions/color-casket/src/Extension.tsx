import { List, Icon, Color } from "@raycast/api";
import { Fragment } from "react";

import ServicesContext from "./components/ServicesContext";
import ColorListItem from "./components/ColorListItem";

import { RenderColor } from "./hooks/useRenderColor";
import { Storage } from "./hooks/useColorStorage";
import { FavoritesStorage } from "./hooks/useFavorites";

import useTimeAgo from "./hooks/useTimeAgo";
import ColorPickers from "./components/ColorPickers";

export interface Services {
  renderer: RenderColor;
  history: Storage;
  favorites: FavoritesStorage;
}

export default function Extension({
  renderer,
  history,
  favorites,
}: {
  renderer: RenderColor;
  history: Storage;
  favorites: FavoritesStorage;
}) {
  const timeAgo = useTimeAgo();

  return (
    <ServicesContext.Provider value={{ renderer, history, favorites }}>
      <List
        isLoading={renderer.state.isLoading || history.isLoading || favorites.isLoading}
        onSearchTextChange={renderer.render}
        searchBarPlaceholder="#000000, rbg(0, 0, 0), hsl(0, 0, 0), black..."
        throttle
      >
        {renderer.state.isLoading && (
          <List.Item
            title="Type one of the available formats..."
            subtitle="#000000, rbg(0, 0, 0), hsl(0, 0, 0), black"
          />
        )}

        {renderer.state.colors?.length === 0 && !renderer.state.isLoading && <ColorPickers />}

        {renderer.state.colors?.map((color, index) => (
          <ColorListItem key={index} color={color} />
        ))}
        {renderer.state.colors?.length === 0 && (
          <Fragment>
            <List.Section title="Favorites">
              {favorites.state.collection.map((color, index) => (
                <ColorListItem
                  key={index}
                  color={color.instance}
                  accessories={[{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]}
                  storageMode={true}
                />
              ))}
            </List.Section>
            <List.Section title="History">
              {history.state.collection.map((color, index) => (
                <ColorListItem
                  key={index}
                  color={color.instance}
                  storageMode={true}
                  accessories={
                    favorites.has(color.instance)
                      ? [
                          { text: timeAgo.format(color.savedAt).toString() },
                          { icon: { source: Icon.Star, tintColor: Color.Yellow } },
                        ]
                      : [{ text: timeAgo.format(color.savedAt).toString() }]
                  }
                />
              ))}
            </List.Section>
          </Fragment>
        )}
      </List>
    </ServicesContext.Provider>
  );
}
