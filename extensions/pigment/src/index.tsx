import { Action, ActionPanel, Cache, Icon, List } from "@raycast/api";
import Color, { default as color } from "color";
import { useMemo, useState } from "react";
import { fetchColor } from "./utils/Color";

const cache = new Cache();

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const cachedPrevious = cache.get("previous_colors");
  const previousColors = cachedPrevious
    ? (JSON.parse(cachedPrevious) as string[]).map((mapped_color) => color(mapped_color))
    : [];

  const activeColor = useMemo(() => {
    try {
      return color(searchText.toLowerCase());
    } catch (error) {
      return null;
    }
  }, [searchText]);

  const addColorToLocalStorage = async (color: string) => {
    const previousColors: string[] = JSON.parse(cache.get("previous_colors") ?? "[]");

    cache.set("previous_colors", JSON.stringify([color, ...previousColors]));
  };

  return (
    <List isShowingDetail onSearchTextChange={setSearchText} searchBarPlaceholder="Enter hex, rgb, hsl, or color name">
      <List.Section title="Active Color">
        {activeColor !== null ? (
          <List.Item
            title={searchText}
            icon={{ source: Icon.CircleFilled, tintColor: activeColor.hex() }}
            subtitle={activeColor.isDark() ? "(Darker)" : "(Lighter)"}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Color (HEX)"
                  onCopy={() => addColorToLocalStorage(searchText)}
                  content={activeColor.hex()}
                />
                <Action.CopyToClipboard
                  title="Copy Color (RGB)"
                  onCopy={() => addColorToLocalStorage(searchText)}
                  content={activeColor.rgb().toString()}
                />
                <Action.CopyToClipboard
                  title="Copy Color (HSL)"
                  onCopy={() => addColorToLocalStorage(searchText)}
                  content={activeColor.hsl().toString()}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`<img src="${fetchColor(activeColor.hex())}" width="100%" height="100%" />`}
                metadata={<Metadata color={activeColor} />}
              />
            }
          />
        ) : null}
      </List.Section>
      <List.Section title="Previous Colors">
        {previousColors.map((color, index) => (
          <List.Item
            key={index}
            title={color.hex()}
            icon={{ source: Icon.CircleFilled, tintColor: color.hex(), tooltip: "color" }}
            subtitle={color.isDark() ? "(Darker)" : "(Lighter)"}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Color (HEX)" content={color.hex()} />
                <Action.CopyToClipboard title="Copy Color (RGB)" content={color.rgb().toString()} />
                <Action.CopyToClipboard title="Copy Color (HSL)" content={color.hsl().toString()} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`<img src="${fetchColor(color.hex())}" width="100%" height="100%" />`}
                metadata={<Metadata color={color} />}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

const Metadata = ({ color }: { color: Color }) => {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Keyword" text={color.keyword()} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Hex" text={color.hex()} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="RGB" text={color.rgb().toString()} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="HSL" text={color.hsl().toString()} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Dark/Light" text={color.isDark() ? "Dark" : "Light"} />
    </List.Item.Detail.Metadata>
  );
};
