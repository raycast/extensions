import { useEffect, useState, useRef } from "react";
import { List } from "@raycast/api";

import dictionary, { dictionaryKeys } from "./dictionary";
import Actions from "./actions";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState<{ tag: string; name: string }[]>([]);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    const filteredKeys = dictionaryKeys.filter((key) => {
      // either tag matches
      const tagMatch = key.toLowerCase().includes(searchText.toLowerCase());

      // or name matches
      const nameMatch = dictionary[key].name?.toLowerCase().includes(searchText.toLowerCase());

      return tagMatch || nameMatch;
    });

    timeoutRef.current = setTimeout(() => {
      setFilteredList(filteredKeys.map((key) => ({ tag: key, name: dictionary[key].name as string })));
    }, 10);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [searchText]);

  return (
    <List
      searchText={searchText}
      searchBarPlaceholder="Type the dicom tag or description"
      isLoading={!filteredList.length}
      throttle={true}
    >
      <List.Section title={`Matching attributes`}>
        {filteredList.map(({ tag, name }) => (
          <List.Item
            key={tag}
            title={`${tag} - ${name}`}
            // Wire up actions
            actions={<Actions tag={tag} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
