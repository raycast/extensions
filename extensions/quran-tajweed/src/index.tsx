import { useEffect, useState } from "react";
import { ActionPanel, List, Action, Icon, Color, useNavigation } from "@raycast/api";
import data from "../assets/data.json";
import { Surah } from "./types";
import SurahDetails from "./components/surah-details";

const items = data as Surah[];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);
  const { push } = useNavigation();

  useEffect(() => {
    filterList(
      items.filter(
        (item) =>
          item.id.toString() == searchText.toLowerCase() ||
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.name_translation.toLowerCase().includes(searchText.toLowerCase()),
      ),
    );
  }, [searchText]);

  return (
    <List
      isShowingDetail
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Quran Surahs"
      searchBarPlaceholder="Search quran surah"
    >
      {filteredList.map((item, index) => {
        return (
          <List.Item
            key={index}
            icon={{
              source: Icon.Book,
              tintColor: {
                light: "#FF01FF",
                dark: "#FFFF50",
                adjustContrast: true,
              },
            }}
            accessories={[{ text: { value: `${item.name}`, color: Color.Green } }]}
            title={`${item.id.toString()} - `}
            subtitle={`${item.name_translation}`}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Surah Information" />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Verses" text={item.array.length.toString()} />
                    <List.Item.Detail.Metadata.Label title="Type" text={item.type_en.toString()} />
                    <List.Item.Detail.Metadata.Label title="Words" text={item.words.toString()} />
                    <List.Item.Detail.Metadata.Label title="Letters" text={item.letters.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title={`Surah ${item.name_translation}`}>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`https://easyquran.com/en/recite-the-tajweed-quran-in-hafs-an-asim-narration/#${item.start_page}`}
                  />
                  <Action
                    onAction={() => push(<SurahDetails surah={item} />)}
                    title={"Show Surah Conent"}
                    icon={{
                      source: Icon.TextCursor,
                      tintColor: {
                        light: "#FF01FF",
                        dark: "#FFFF50",
                        adjustContrast: true,
                      },
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
