import { Grid, Color } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getPinnedIcons, getRecentIcons, getPinnedMovement } from "./utils/storage";
import { getStoredOptions, setStoredOptions } from "./utils/options";
import { EmptyView, InvalidAPIKey } from "./components/empty-view";
import { allStylesImage, gridSize } from "./utils/utils";
import { getIcons, getStyles } from "./hooks/api";
import { Icon8Item } from "./components/icon";
import { Icon8, Options, Style } from "./types/types";
import { defaultStyles } from "./utils/utils";

export default function SearchIcons() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [style, setStyle] = useState<string | undefined>();
  const [styles, setStyles] = useState<Style[] | undefined>([]);
  const [options, setOptions] = useState<Options>(getStoredOptions());

  const [icons, setIcons] = useState<Icon8[] | undefined>(undefined);
  const [pinnedIcons, setPinnedIcons] = useState<Icon8[]>(getPinnedIcons());
  const [recentIcons, setRecentIcons] = useState<Icon8[]>(getRecentIcons());

  const [refresh, setRefresh] = useState(false);
  const refreshIcons = () => setRefresh(!refresh);

  useEffect(() => {
    (async () => {
      setStyles(await getStyles());
    })();
  }, []);

  useEffect(() => {
    setPinnedIcons(getPinnedIcons(style));
    setRecentIcons(getRecentIcons(style));
  }, [refresh, style]);

  useEffect(() => {
    (async () => {
      if (searchText) {
        setIsLoading(true);
        setIcons(await getIcons(searchText, style));
        setIsLoading(false);
      } else {
        setIcons(undefined);
      }
    })();
  }, [searchText, style]);

  useEffect(() => {
    setStoredOptions(options);
  }, [options]);

  if (styles === undefined) {
    return <InvalidAPIKey />;
  }
  return (
    <Grid
      isLoading={isLoading}
      itemSize={gridSize}
      inset={Grid.Inset.Small}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Icons"
      throttle={true}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Icon Styles"
          defaultValue={style}
          onChange={(value: string) => setStyle(value ? value : undefined)}
        >
          <Grid.Dropdown.Item title="All Styles" value={""} icon={{ source: allStylesImage }} />
          <Grid.Dropdown.Section>
            {styles.map((style) => (
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
      }
    >
      {icons === undefined ? (
        pinnedIcons.length === 0 && recentIcons.length === 0 ? (
          <EmptyView message="No Pinned or Recent Icons" />
        ) : (
          <React.Fragment>
            <Grid.Section title="Pinned Icons">
              {pinnedIcons.map((icon: Icon8, index: number) => {
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
        )
      ) : icons.length === 0 ? (
        <EmptyView message={`No Results for "${searchText}"`} />
      ) : (
        icons.map((icon: Icon8, index: number) => (
          <Icon8Item
            key={index}
            icon={icon}
            platform={style}
            refresh={refreshIcons}
            options={options}
            setOptions={setOptions}
          />
        ))
      )}
    </Grid>
  );
}
