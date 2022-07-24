import { Icon, Grid, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPinnedIcons, getRecentIcons, getPinnedMovement } from "./utils/storage";
import { getGridSize } from "./utils/grid";
import { getIcons, getStyles, numRecent } from "./hooks/api";
import { Icon8, Style } from "./types/types";
import { defaultStyles } from "./utils/utils";
import { Icon8Item } from "./components/icon";
import { getStoredOptions, setStoredOptions } from "./utils/options";

export default function SearchIcons() {
  const gridSize: Grid.ItemSize = getGridSize();

  const [searchText, setSearchText] = useState("");
  const [icons, setIcons] = useState<Icon8[] | null>([]);

  const [style, setStyle] = useState<string>();
  const [styles, setStyles] = useState<Style[] | null>();

  useEffect(() => {
    const fetchStyles = async () => {
      setStyles(await getStyles());
    };
    fetchStyles();
  }, []);

  const [pinnedIcons, setPinnedIcons] = useState<Icon8[] | null>(null);
  const [recentIcons, setRecentIcons] = useState<Icon8[] | null>(null);

  const getStoredIcons = async () => {
    let pinned = await getPinnedIcons();
    if (style) {
      pinned = pinned.filter((icon) => icon.platform === style);
    }
    setPinnedIcons(pinned);
    let recent = await getRecentIcons();
    if (style) {
      recent = recent.filter((icon) => icon.platform === style);
    }
    recent = recent.slice(0, numRecent);
    setRecentIcons(recent);
  };

  const [refresh, setRefresh] = useState(false);
  const refreshIcons = () => setRefresh(!refresh);

  useEffect(() => {
    getStoredIcons();
  }, [refresh, style]);

  useEffect(() => {
    const fetchIcons = async () => {
      if (searchText) {
        setIcons(null);
        const icons = await getIcons(searchText, style);
        setIcons(icons);
      } else {
        setIcons([]);
      }
    };
    fetchIcons();
  }, [searchText, style]);

  const [imageOptions, setImageOptions] = useState(null);

  const getImageOptions = async () => {
    setImageOptions(await getStoredOptions());
  };

  const storeImageOptions = async () => {
    await setStoredOptions(imageOptions);
  };

  useEffect(() => {
    getImageOptions();
  }, []);

  useEffect(() => {
    storeImageOptions();
  }, [imageOptions]);

  return (
    <Grid
      isLoading={icons === null || imageOptions === null}
      itemSize={gridSize}
      inset={Grid.Inset.Medium}
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Styles"
          storeValue
          onChange={(value: string) => {
            if (value) setStyle(value);
            else setStyle(undefined);
          }}
        >
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
                    tintColor: style.url ? (defaultStyles[style.title] ? Color.PrimaryText : null) : Color.Red,
                  }}
                />
              ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.Section title="Pinned Icons">
        {searchText === "" &&
          pinnedIcons?.map((icon: Icon8, index: number) => {
            const movement = getPinnedMovement(pinnedIcons, icon.id);
            return (
              <Icon8Item
                key={index}
                icon={icon}
                platform={style}
                refresh={refreshIcons}
                pinned={true}
                movement={movement}
                options={imageOptions}
                setOptions={setImageOptions}
              />
            );
          })}
      </Grid.Section>
      <Grid.Section title="Recent Icons">
        {searchText === "" &&
          recentIcons?.map((icon: Icon8, index: number) => (
            <Icon8Item
              key={index}
              icon={icon}
              platform={style}
              refresh={refreshIcons}
              recent={true}
              options={imageOptions}
              setOptions={setImageOptions}
            />
          ))}
      </Grid.Section>
      {icons?.map((icon: Icon8, index: number) => (
        <Icon8Item
          key={index}
          icon={icon}
          platform={style}
          refresh={refreshIcons}
          options={imageOptions}
          setOptions={setImageOptions}
        />
      ))}
    </Grid>
  );
}
