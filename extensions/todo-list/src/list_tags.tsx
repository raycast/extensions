import { List } from "@raycast/api";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { ALL_TAG_VALUE, todoAtom, selectedTagAtom } from "./atoms";
import { getTags } from "./tags";

export default function ListTags() {
  const [todoSections] = useAtom(todoAtom);
  const [selectedTag, setSelectedTag] = useAtom(selectedTagAtom);
  const tags = getTags(todoSections);
  const value = tags.includes(selectedTag) ? selectedTag : ALL_TAG_VALUE;

  useEffect(() => {
    if (selectedTag !== value) setSelectedTag(value);
  }, [selectedTag, value, setSelectedTag]);

  return (
    <List.Dropdown value={value} onChange={setSelectedTag} tooltip="Filter by Tag">
      <List.Dropdown.Item title="All Todos" value={ALL_TAG_VALUE} />
      {tags.map((tag) => (
        <List.Dropdown.Item key={tag} title={tag} value={tag} />
      ))}
    </List.Dropdown>
  );
}
