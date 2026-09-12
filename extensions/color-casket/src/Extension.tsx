import { List, Icon, Color, getSelectedText } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";

import ServicesContext from "./components/ServicesContext";
import ColorListItem from "./components/ColorListItem";

import { RenderColor } from "./hooks/useRenderColor";
import { Storage } from "./hooks/useColorStorage";
import { FavoritesStorage } from "./hooks/useFavorites";

import useTimeAgo from "./hooks/useTimeAgo";
import ColorPickers from "./components/ColorPickers";
import TypeFilter from "./TypeFilter";
import { ColorType } from "./colors/Color";
import { SavedColor } from "./hooks/colorSaver";
import { getValidColor } from "./validators";

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
  const [searchText, setSearchText] = useState("");
  const [readingSelection, setReadingSelection] = useState(true);

  useEffect(() => {
    renderer.render(searchText);
  }, [searchText]);

  useEffect(() => {
    getSelectedText()
      .then((text) => {
        const color = getValidColor(text.trim());
        if (color && !searchText) {
          setSearchText(color);
        }
        setReadingSelection(false);
      })
      .catch(() => {
        setReadingSelection(false);
      });
  }, []);

  const timeAgo = useTimeAgo();

  const [filterType, setFilterType] = useState("All");

  const onColorTypeChange = (type: ColorType) => {
    setFilterType(type);
  };

  const filterCallback = (color: SavedColor) => {
    if (filterType === "All") {
      return true;
    }

    return color.instance.type === filterType;
  };

  return (
    <ServicesContext.Provider value={{ renderer, history, favorites }}>
      <List
        isLoading={
          (readingSelection && !searchText) || renderer.state.isLoading || history.isLoading || favorites.isLoading
        }
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="#000000, rbg(0, 0, 0), hsl(0, 0, 0), black..."
        searchBarAccessory={<TypeFilter onColorTypeChange={onColorTypeChange} />}
        throttle
      >
        {renderer.state.isLoading && (
          <List.Item
            title="Type one of the available formats..."
            subtitle="#000000, rbg(0, 0, 0), hsl(0, 0, 0), black"
          />
        )}

        {renderer.state.colors?.length === 0 && !renderer.state.isLoading && <ColorPickers />}

        {renderer.state.colors
          ?.filter((color) => filterType === "All" || color.type === filterType)
          .map((color, index) => (
            <ColorListItem key={index} color={color} />
          ))}
        {renderer.state.colors?.length === 0 && (
          <Fragment>
            <List.Section title="Favorites">
              {favorites.state.collection.filter(filterCallback).map((color, index) => (
                <ColorListItem
                  key={index}
                  color={color.instance}
                  accessories={[{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]}
                  storageMode={true}
                />
              ))}
            </List.Section>
            <List.Section title="History">
              {history.state.collection.filter(filterCallback).map((color, index) => (
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
