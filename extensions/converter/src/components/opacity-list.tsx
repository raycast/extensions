import { Action, ActionPanel, Color, Image, List } from "@raycast/api";
import { getOpacity } from "../hooks/color-hooks";
import Mask = Image.Mask;
import { Dispatch, SetStateAction, useState } from "react";
import { colorTags } from "../utils/color-converter-utils";
import { EmptyView } from "./empty-view";
import { isEmpty } from "../utils/common-utils";

export function OpacityList(props: { tag: string; setTag: Dispatch<SetStateAction<string>> }) {
  const { tag, setTag } = props;
  const [searchContent, setSearchContent] = useState<string>("");
  const { opacity, loading } = getOpacity();
  return (
    <List
      isLoading={loading || isEmpty(tag)}
      searchBarPlaceholder={"Search opacity or hex"}
      searchBarAccessory={
        <List.Dropdown tooltip={"Color or Opacity"} onChange={setTag} storeValue={true}>
          {colorTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
      onSearchTextChange={(newValue) => setSearchContent(newValue.replaceAll(" ", "").toLowerCase())}
    >
      <EmptyView title={"No opacity"} icon={"color-empty-view-icon.svg"} description={""} />
      {opacity.map((value, index) => {
        return (
          (value.opacity.includes(searchContent) || value.hex.toLowerCase().includes(searchContent)) && (
            <List.Item
              key={"ColorSpace_" + index}
              title={value.opacity}
              subtitle={value.hex.toUpperCase()}
              icon={{
                source: { light: "rectangle-icon.png", dark: "rectangle-icon@dark.png" },
                tintColor: {
                  light: `rgb(255,255,255,${parseFloat(value.opacity) / 100})`,
                  dark: `rgb(0,0,0,${1 - parseFloat(value.opacity) / 100})`,
                },
                mask: Mask.Circle,
              }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={"Copy Opacity"} content={value.opacity} />
                  <Action.CopyToClipboard title={"Copy HEX"} content={value.hex} />
                </ActionPanel>
              }
            ></List.Item>
          )
        );
      })}
    </List>
  );
}
