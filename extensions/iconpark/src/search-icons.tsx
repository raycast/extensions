import { Action, ActionPanel, environment, Grid, Icon, open, showInFinder, showToast, Toast } from "@raycast/api";
import * as iconPark from "@icon-park/svg";
import { buildIconBase, kebabToOtherCase, toBase64 } from "./utils/common-utils";
import { configDefault, filePath, iconBaseDefault, iconParkCategory } from "./utils/constants";
import { useMemo, useState } from "react";
import { ActionSettings } from "./components/action-settings";
import * as fs from "fs";
import { EmptyView } from "./components/empty-view";
import { ActionToIconPark } from "./components/action-to-Icon-park";
import { ConfigIcon } from "./config-icon";
import { useIconConfig } from "./hooks/useIconConfig";
import { IIconConfig } from "@icon-park/svg/lib/runtime";
import { IconInfo } from "./types/types";
import Fuse from "fuse.js";
import Style = Toast.Style;
import { Home as iconParkHome } from "@icon-park/svg/lib/map";

const svgValue = (icon: IconInfo, dark?: boolean) => {
  const svg = icon?.svgCode || "";
  if (dark) {
    return toBase64(svg.replaceAll("#333", "#fff"));
  }
  return toBase64(svg.replaceAll("#333", "#000"));
};

export default function SearchIcons() {
  iconParkHome({ theme: "multi-color" });
  const { data: iconConfigData, isLoading, mutate } = useIconConfig();
  const [searchText, setSearchText] = useState<string>("");
  const [category, setCategory] = useState<string>(iconParkCategory[0]);

  const { iconConfig, iconBase } = useMemo(() => {
    if (!iconConfigData) {
      return { iconConfig: configDefault, iconBase: iconBaseDefault };
    }
    const iconConfig_: IIconConfig = JSON.parse(iconConfigData);
    return { iconConfig: iconConfig_, iconBase: buildIconBase(iconConfig_) };
  }, [iconConfigData]);

  const iconInfosData = useMemo(() => {
    const data = fs.readFileSync(environment.assetsPath + "/icons.json", "utf8");
    const iconInfos_ = JSON.parse(data) as IconInfo[];
    for (const value of iconInfos_) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      value.svgCode = iconPark[kebabToOtherCase(value.name)](iconBase);
    }
    return iconInfos_;
  }, [iconBase]);

  const categoryIconInfos = useMemo(() => {
    if (!iconInfosData) return [];
    if (category === "All") return iconInfosData;
    const iconInfo: IconInfo[] = [];
    iconInfosData.forEach((value) => {
      if (category === value.category) {
        iconInfo.push(value);
      }
    });
    return iconInfo;
  }, [iconInfosData, category]);

  const fuseIconInfos = useMemo(() => {
    if (searchText === "") return categoryIconInfos;
    // fuse icons
    const fuse_ = new Fuse(categoryIconInfos, {
      keys: [
        { name: "name", weight: 3 },
        { name: "title", weight: 1 },
        { name: "category", weight: 0.5 },
        { name: "categoryCN", weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
    return fuse_.search(searchText).map((result) => result.item);
  }, [categoryIconInfos, searchText]);

  const iconInfos = useMemo(() => {
    let iconInfos_ = [];
    if (searchText === "") {
      iconInfos_ = categoryIconInfos;
    } else {
      iconInfos_ = fuseIconInfos;
    }
    return iconInfos_;
  }, [categoryIconInfos, fuseIconInfos, searchText, iconBase]);

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${iconInfosData?.length} icons`}
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={
        <Grid.Dropdown onChange={setCategory} tooltip={"Category"} storeValue={false}>
          {iconParkCategory.map((value) => {
            return <Grid.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </Grid.Dropdown>
      }
    >
      <EmptyView />
      {iconInfos.slice(0, 400).map((value) => {
        return (
          <Grid.Item
            key={value.id + ""}
            keywords={[...value.tag, ...value.category.toLowerCase(), ...value.categoryCN]}
            content={{
              source: {
                dark: svgValue(value, true),
                light: svgValue(value, false),
              },
            }}
            title={kebabToOtherCase(value.name, " ")}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Download}
                  title={"Download SVG Icon"}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={async () => {
                    await showToast(Style.Animated, "Downloading SVG icon...");
                    fs.writeFileSync(filePath + "/" + value.name + ".svg", String(value.svgCode));
                    const options: Toast.Options = {
                      style: Toast.Style.Success,
                      title: "Success",
                      message: "Click to Open Icon",
                      primaryAction: {
                        title: "Open icon",
                        onAction: (toast) => {
                          open(filePath + "/" + value.name + ".svg");
                          toast.hide();
                        },
                      },
                      secondaryAction: {
                        title: "Show in finder",
                        onAction: (toast) => {
                          showInFinder(filePath + "/" + value.name + ".svg");
                          toast.hide();
                        },
                      },
                    };
                    await showToast(options);
                  }}
                />
                <Action.CopyToClipboard icon={Icon.Clipboard} title={"Copy SVG Code"} content={String(value.svgCode)} />
                <Action.Push
                  icon={Icon.Pencil}
                  title={"Config SVG Icon"}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<ConfigIcon iconConfig={iconConfig} mutate={mutate} />}
                />
                <ActionToIconPark />
                <ActionSettings />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
