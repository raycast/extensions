import { Grid, Color } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getPinnedIcons, getRecentIcons, getPinnedMovement } from "./utils/storage";
import { defaultOptions, getStoredOptions, setStoredOptions } from "./utils/options";
import { EmptyView, InvalidAPIKey } from "./components/empty-view";
import { allStylesImage, gridSize } from "./utils/utils";
import { getIcons, getStyles } from "./hooks/api";
import { Icon8Item } from "./components/icon";
import { Icon8, Options, Style } from "./types/types";
import { defaultStyles } from "./utils/utils";

export default function SearchIcons() {
  const [searchText, setSearchText] = useState("");
  const [icons, setIcons] = useState<Icon8[] | null>([]);

  const [style, setStyle] = useState<string | undefined>();
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
    setPinnedIcons(await getPinnedIcons(style));
    setRecentIcons(await getRecentIcons(style));
  };

  const [refresh, setRefresh] = useState(false);
  const refreshIcons = () => setRefresh(!refresh);

  useEffect(() => {
    getStoredIcons();
  }, [refresh, style]);

  const fetchIcons = async () => {
    if (searchText) {
      setIsLoading(true);
      const icons = await getIcons(searchText, style);
      setIcons(icons);
      setIsLoading(false);
    } else {
      setIcons([]);
    }
  };

  useEffect(() => {
    fetchIcons();
  }, [searchText, style]);

  const [options, setOptions] = useState<Options>(defaultOptions);

  useEffect(() => {
    const getOptions = async () => setOptions(await getStoredOptions());
    getOptions();
  }, []);

  useEffect(() => {
    const storeOptions = async () => {
      if (options) await setStoredOptions(options);
    };
    storeOptions();
  }, [options]);

  return styles ? (
    <Grid
      isLoading={isLoading}
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
              <Grid.Dropdown.Item title="All Styles" value={""} icon={{ source: allStylesImage }} />
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
                    options={options}
                    setOptions={setOptions}
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
                  options={options}
                  setOptions={setOptions}
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
          options={options}
          setOptions={setOptions}
        />
      ))}
    </Grid>
  ) : (
    <InvalidAPIKey />
  );
}
