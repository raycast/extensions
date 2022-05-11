import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Mask = Image.Mask;
import { commonPreferences, isEmpty } from "../utils/common-utils";
import { getColorSpaces } from "../hooks/color-hooks";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "../utils/input-item-utils";
import * as d3 from "d3-color";
import { hsl, rgb } from "d3-color";
import { colorTags } from "../utils/color-converter-utils";
import { EmptyView } from "./empty-view";

export function ColorList(props: { tag: string; setTag: Dispatch<SetStateAction<string>> }) {
  const { tag, setTag } = props;
  const { autoDetect, priorityDetection } = commonPreferences();

  const [searchContent, setSearchContent] = useState<string>("");

  const { colorSpaces, contrastColors, similarColors, loading } = getColorSpaces(searchContent);

  useEffect(() => {
    async function _fetchDetail() {
      if (autoDetect) {
        const inputItem =
          priorityDetection === "selected" ? await fetchItemInputSelectedFirst() : await fetchItemInputClipboardFirst();
        const _color = d3.color(inputItem);
        (_color instanceof rgb || _color instanceof hsl) && setSearchContent(inputItem);
      }
    }
    _fetchDetail().then();
  }, []);
  // const { searchContent, setSearchContent, loading, colorSpaces, contrastColors, similarColors } = props;
  return (
    <List
      isLoading={loading || isEmpty(tag)}
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      searchBarPlaceholder={"Enter any color: rgb(0, 0, 0), #000000, hsl(0, 0%, 0%), colors"}
      searchBarAccessory={
        <List.Dropdown tooltip={"Color or Opacity"} onChange={setTag} storeValue={true}>
          {colorTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      <EmptyView title={"No color"} icon={"color-empty-view-icon.svg"} description={""} />
      <List.Section title={"Color Space"}>
        {colorSpaces.map((value, index) => {
          return (
            <List.Item
              id={value[0].toUpperCase()}
              key={"ColorSpace_" + index}
              title={value[0].toUpperCase()}
              subtitle={value[1]}
              icon={{ source: "rectangle-icon.png", tintColor: colorSpaces[0][1], mask: Mask.Circle }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={"Copy " + value[0].toUpperCase()} content={value[1]} />
                </ActionPanel>
              }
            ></List.Item>
          );
        })}
      </List.Section>

      <List.Section title={"Contrast Color"}>
        {!isEmpty(contrastColors) && (
          <List.Item
            title={contrastColors}
            icon={{ source: "rectangle-icon.png", tintColor: contrastColors, mask: Mask.Circle }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy RGB"} content={contrastColors} />
                <Action
                  icon={Icon.MagnifyingGlass}
                  title={"Search Color"}
                  onAction={() => {
                    setSearchContent(contrastColors);
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title={"Similar Color"}>
        {similarColors.map((value, index) => {
          return (
            <List.Item
              key={"SimilarColor_" + index}
              title={value}
              icon={{ source: "rectangle-icon.png", tintColor: value, mask: Mask.Circle }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={"Copy RGB"} content={value} />
                  <Action
                    icon={Icon.MagnifyingGlass}
                    title={"Search Color"}
                    onAction={() => {
                      setSearchContent(value);
                    }}
                  />
                </ActionPanel>
              }
            ></List.Item>
          );
        })}
      </List.Section>
    </List>
  );
}
