import { List } from "@raycast/api";
import { useAtom } from "jotai";
import { ALL_TAG_VALUE, todoAtom, selectedTagAtom, TodoSections } from "./atoms";

const ListTags = () => {
  const [todoSections] = useAtom(todoAtom);
  const [, setSelectedTag] = useAtom(selectedTagAtom);
  const sectionKeys = Object.keys(todoSections) as (keyof TodoSections)[];
  const tagsSet = new Set<string>();

  return (
    <List.Dropdown onChange={(newValue) => setSelectedTag(newValue)} tooltip="Todo With Tags">
      <List.Dropdown.Item title="All" value={ALL_TAG_VALUE} />
      {sectionKeys.map((sectionKey) =>
        todoSections[sectionKey].map((item, i) => {
          if (item.tag != undefined && item.tag != "") {
            if (!tagsSet.has(item.tag)) {
              tagsSet.add(item.tag);
              return <List.Dropdown.Item key={i} title={item.tag} value={item.tag} />;
            }
          }
          return null;
        }),
      )}
    </List.Dropdown>
  );
};

export default ListTags;
