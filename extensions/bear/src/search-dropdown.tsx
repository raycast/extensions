import { List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useBearDb } from "./hooks";

type Tag = string;
type TagsDropdownProps = {
  onTagChange: (tag: Tag | null) => void;
};

const TagsDropdown = (props: TagsDropdownProps) => {
  const { onTagChange } = props;
  const [db, error] = useBearDb();
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (db != null) {
      setTags(db.getTags());
    }
  }, [db]);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }
  return (
    <List.Dropdown
      tooltip="Select a tag"
      storeValue={true}
      onChange={(newValue) => {
        if (newValue === "All tags") {
          onTagChange(null);
          return;
        }
        onTagChange(newValue);
      }}
      defaultValue="All tags"
    >
      <List.Dropdown.Section>
        <List.Dropdown.Item key={"All tags"} title={"All tags"} value={"All tags"} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Tags">
        {tags.map((tagTitle) => (
          <List.Dropdown.Item key={tagTitle} title={tagTitle} value={tagTitle} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default TagsDropdown;
