import { Icon, List } from "@raycast/api";
import { Surah } from "../types";
import { useEffect, useState } from "react";

export default function SurahDetails(props: { surah: Surah }) {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(props.surah.array);
  useEffect(() => {
    filterList(
      props.surah.array.filter(
        (item) =>
          item.id.toString() == searchText.toLowerCase() || item.en.toLowerCase().includes(searchText.toLowerCase()),
      ),
    );
  }, [searchText]);

  return (
    <List
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle={`${props.surah.name_translation}`}
      searchBarPlaceholder="Search Verses"
    >
      {filteredList.map((item, index) => {
        return (
          <List.Item
            title={` (${item.id})  ${item.en}`}
            key={index}
            icon={{
              source: Icon.Germ,
              tintColor: {
                light: "#FF01FF",
                dark: "#FFFF50",
                adjustContrast: true,
              },
            }}
          />
        );
      })}
    </List>
  );
}
