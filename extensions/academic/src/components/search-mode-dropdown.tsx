import { Form, Icon, List } from "@raycast/api";

export type SearchMode =
  "search" | "advanced" | "encyclopedia" | "find" | "pdf";

export function SearchModeDropdown({
  value,
  onChange,
}: {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Search Mode"
      value={value}
      onChange={(next) => onChange(next as SearchMode)}
    >
      <List.Dropdown.Item
        value="search"
        title="Search"
        icon={Icon.MagnifyingGlass}
      />
      <List.Dropdown.Item value="advanced" title="Advanced" icon={Icon.List} />
      <List.Dropdown.Item
        value="encyclopedia"
        title="Encyclopedia"
        icon={Icon.Book}
      />
      <List.Dropdown.Item
        value="find"
        title="Find Selected Text"
        icon={Icon.Clipboard}
      />
      <List.Dropdown.Item
        value="pdf"
        title="Identify PDF"
        icon={Icon.Document}
      />
    </List.Dropdown>
  );
}

export function SearchModeFormDropdown({
  value,
  onChange,
}: {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
}) {
  return (
    <Form.Dropdown
      id="searchMode"
      title="Search Mode"
      value={value}
      onChange={(next) => onChange(next as SearchMode)}
    >
      <Form.Dropdown.Item value="search" title="Search" />
      <Form.Dropdown.Item value="advanced" title="Advanced" />
      <Form.Dropdown.Item value="encyclopedia" title="Encyclopedia" />
      <Form.Dropdown.Item value="find" title="Find Selected Text" />
      <Form.Dropdown.Item value="pdf" title="Identify PDF" />
    </Form.Dropdown>
  );
}
