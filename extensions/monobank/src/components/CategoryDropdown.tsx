import { List } from "@raycast/api";

export interface CategoryOption<T extends string> {
  value: T;
  title: string;
}

/** Category filter for the search bar. Each inner array is rendered as its own dropdown section. */
export default function CategoryDropdown<T extends string>(props: {
  sections: CategoryOption<T>[][];
  onChange: (value: T) => void;
}) {
  const { sections, onChange } = props;

  return (
    <List.Dropdown tooltip="Select Category" storeValue onChange={(value) => onChange(value as T)}>
      {sections.map((options, index) => (
        <List.Dropdown.Section key={index}>
          {options.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
