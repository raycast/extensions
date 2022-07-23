import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color } from "@raycast/api";
import { getGridItemSize } from "./utils/grid";
import { getIcons, getStyles } from "./hooks/api";
import { Icon8, Style } from "./types/types";
import { defaultStyles } from "./utils/utils";
import { Icon8Item } from "./components/icon";

export default function SearchIcons() {
  const gridSize: Grid.ItemSize = getGridItemSize();

  const [searchText, setSearchText] = useState("");
  const [icons, setIcons] = useState<Icon8[] | null>();

  const [style, setStyle] = useState<string>();
  const [styles, setStyles] = useState<Style[] | null>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchStyles = async () => {
      setStyles(await getStyles());
    };
    fetchStyles();
  }, []);

  useEffect(() => {
    const fetchIcons = async () => {
      if (searchText) {
        setIsLoading(true);
        setIcons(await getIcons(searchText, style === "" ? undefined : style));
        setIsLoading(false);
      }
    };
    fetchIcons();
  }, [searchText, style]);

  return (
    <Grid
      isLoading={isLoading}
      itemSize={gridSize}
      inset={Grid.Inset.Large}
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Styles" storeValue onChange={(value: string) => setStyle(value)}>
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item
              title="All Styles"
              value={""}
              icon={{ source: "https://maxst.icons8.com/vue-static/icon/all-styles.png" }}
            />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section>
            {styles &&
              styles.map((style) => (
                <Grid.Dropdown.Item
                  key={style.code}
                  title={style.title}
                  value={style.code}
                  icon={{
                    source: style.url ? style.url : Icon.Warning,
                    tintColor: defaultStyles[style.title] ? Color.PrimaryText : null,
                  }}
                />
              ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isLoading && icons && icons.map((icon: Icon8, index: number) => <Icon8Item key={index} {...icon} />)}
    </Grid>
  );
}
