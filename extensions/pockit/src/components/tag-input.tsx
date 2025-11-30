import { Color, Form, Icon } from "@raycast/api";
import type { Tag } from "../types";

interface TagInputProps {
  id: string;
  title: string;
  value: string[]; // Normalized tag names
  onChange: (tagNames: string[]) => void;
  availableTags: Tag[];
}

export function TagInput({ id, title, value, onChange, availableTags }: TagInputProps) {
  return (
    <Form.TagPicker
      id={id}
      title={title}
      placeholder="Select tags..."
      value={value}
      onChange={onChange}
      info="Use 'Manage Tags' command to create new tags"
    >
      {availableTags
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.name}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tag.color || Color.Blue }}
          />
        ))}
    </Form.TagPicker>
  );
}
