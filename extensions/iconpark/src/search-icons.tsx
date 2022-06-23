import { Action, ActionPanel, Grid, Icon, open, showInFinder, showToast, Toast } from "@raycast/api";
import * as iconPark from "@icon-park/svg";
import { getIconConfig, getIconInfos } from "./hooks/hooks";
import { kebabToOtherCase, toBase64 } from "./utils/common-utils";
import { iconParkCategory } from "./utils/constants";
import { useState } from "react";
import { homedir } from "os";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import * as fs from "fs";
import { EmptyView } from "./components/empty-view";
import { ActionToIconPark } from "./components/action-to-Icon-park";
import { ConfigIcon } from "./config-icon";
import Style = Toast.Style;

export default function SearchIcons() {
  const filePath = homedir() + "/Downloads";
  const [category, setCategory] = useState<string>(iconParkCategory[0]);
  const [refresh, setRefresh] = useState<number>(0);
  const { iconConfig, iconBase, configLoading } = getIconConfig(refresh);
  const { iconInfos, iconLoading } = getIconInfos();

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Medium}
      isLoading={iconLoading || configLoading}
      searchBarPlaceholder={"Search 2657 icons"}
      searchBarAccessory={
        <Grid.Dropdown onChange={setCategory} tooltip={"Category"} storeValue={false}>
          {iconParkCategory.map((value) => {
            return <Grid.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </Grid.Dropdown>
      }
    >
      <EmptyView />
      {iconParkCategory.map((categoryValue) => {
        return (
          !configLoading &&
          category === categoryValue && (
            <Grid.Section key={categoryValue} title={categoryValue}>
              {iconInfos.map((value) => {
                // @ts-expect-error a bit too dynamic for TS
                const svgCode = iconPark[kebabToOtherCase(value.name, "")](JSON.parse(iconBase));

                return (
                  value.category === categoryValue && (
                    <Grid.Item
                      key={value.id + ""}
                      keywords={[...value.tag, ...value.category.toLowerCase(), ...value.categoryCN]}
                      content={toBase64(svgCode)}
                      title={kebabToOtherCase(value.name, " ")}
                      subtitle={value.title}
                      actions={
                        <ActionPanel>
                          <Action
                            icon={Icon.Download}
                            title={"Download SVG Icon"}
                            shortcut={{ modifiers: ["cmd"], key: "s" }}
                            onAction={async () => {
                              await showToast(Style.Animated, "Downloading SVG icon...");
                              fs.writeFileSync(filePath + "/" + value.name + ".svg", svgCode);
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
                          <Action.CopyToClipboard
                            icon={Icon.Clipboard}
                            title={"Copy SVG Code"}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
                            content={svgCode}
                          />
                          <Action.Push
                            icon={Icon.MemoryChip}
                            title={"Config SVG Icon"}
                            shortcut={{ modifiers: ["ctrl"], key: "a" }}
                            target={<ConfigIcon iconConfig={iconConfig} setRefresh={setRefresh} />}
                          />
                          <ActionToIconPark />
                          <ActionOpenPreferences />
                        </ActionPanel>
                      }
                    />
                  )
                );
              })}
            </Grid.Section>
          )
        );
      })}
    </Grid>
  );
}
