import type { FC } from "react";
import { List } from "@raycast/api";
import type { EmoticonCategory } from "../types/emoticons";

type SearchBarProps = {
  categories: EmoticonCategory[];
  onChange: (value: string) => void;
};

export const SearchBar: FC<SearchBarProps> = ({ categories, onChange }) => {
  const categoryItems = categories.sort((a, b) => (a.title > b.title ? 1 : -1));

  return (
    <List.Dropdown tooltip="Select Category" onChange={onChange} storeValue>
      <List.Dropdown.Item key="all" title="All" value="all" />

      {categoryItems.map(({ slug, title }) => (
        <List.Dropdown.Item key={slug} title={title} value={slug} />
      ))}
    </List.Dropdown>
  );
};
