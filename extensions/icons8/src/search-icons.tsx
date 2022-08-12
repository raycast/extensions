import { Grid, Color } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getPinnedIcons, getRecentIcons, getPinnedMovement } from "./utils/storage";
import { getStoredOptions, setStoredOptions } from "./utils/options";
import { EmptyView, InvalidAPIKey } from "./components/empty-view";
import { gridSize, numRecent } from "./utils/utils";
import { getIcons, getStyles } from "./hooks/api";
import { Icon8Item } from "./components/icon";
import { Icon8, Options, Style } from "./types/types";
import { defaultStyles } from "./utils/utils";

export default function SearchIcons() {
  const [searchText, setSearchText] = useState("");
  const [icons, setIcons] = useState<Icon8[] | null>([]);

  const [style, setStyle] = useState<string | undefined>(undefined);
  const [styles, setStyles] = useState<Style[] | null>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStyles = async () => {
      await getStoredIcons();
      setIsLoading(false);
      setStyles(await getStyles());
    };
    fetchStyles();
  }, []);

  const [pinnedIcons, setPinnedIcons] = useState<Icon8[]>();
  const [recentIcons, setRecentIcons] = useState<Icon8[]>();

  const getStoredIcons = async () => {
    let pinned = await getPinnedIcons();
    let recent = await getRecentIcons();
    if (style) {
      pinned = pinned.filter((icon) => icon.platform === style);
      recent = recent.filter((icon) => icon.platform === style).slice(0, numRecent);
    }
    setPinnedIcons(pinned);
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
      }
    };
    fetchIcons();
    return () => {
      setIcons([]);
    };
  }, [searchText, style]);

  const [imageOptions, setImageOptions] = useState<Options>();

  useEffect(() => {
    const getImageOptions = async () => setImageOptions(await getStoredOptions());
    getImageOptions();
  }, []);

  useEffect(() => {
    const storeImageOptions = async () => {
      if (imageOptions) await setStoredOptions(imageOptions);
    };
    storeImageOptions();
  }, [imageOptions]);

  return styles ? (
    <Grid
      isLoading={isLoading || icons === null}
      itemSize={gridSize}
      inset={Grid.Inset.Small}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Icons"
      throttle={true}
      searchBarAccessory={
        styles ? (
          <Grid.Dropdown
            tooltip="Styles"
            defaultValue={style}
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
                      source: style.url,
                      tintColor: defaultStyles[style.title] ? Color.PrimaryText : null,
                    }}
                  />
                ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        ) : null
      }
    >
      {(!icons || icons?.length === 0) &&
        (pinnedIcons?.length === 0 && recentIcons?.length === 0 ? (
          <EmptyView />
        ) : (
          <React.Fragment>
            <Grid.Section title="Pinned Icons">
              {pinnedIcons?.map((icon: Icon8, index: number) => {
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
              {recentIcons?.map((icon: Icon8, index: number) => (
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
          </React.Fragment>
        ))}
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
  ) : (
    <InvalidAPIKey />
  );
}
