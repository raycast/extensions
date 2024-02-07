import { List } from "@raycast/api";
import { useState } from "react";
import RSSPlainListView from "./RSSPlainListView";
import RSSByTagsView from "./RSSByTagsView";

const viewTypes = [
  {
    id: "all",
    name: "All",
  },
  {
    id: "tag",
    name: "By Tag",
  },
];

function Dropdown(props: { defaultValue: string; onChange: (newValue: string) => void }) {
  const { defaultValue, onChange } = props;
  return (
    <List.Dropdown
      tooltip="Select View"
      defaultValue={defaultValue}
      onChange={(newValue) => {
        onChange(newValue);
      }}
    >
      {viewTypes.map((v) => (
        <List.Dropdown.Item key={v.id} title={v.name} value={v.id} />
      ))}
    </List.Dropdown>
  );
}

export default function RSSSearch(props: { defaultSearchText?: string }) {
  const { defaultSearchText } = props;
  const [view, setView] = useState<"all" | "tag">("all");

  if (view === "tag") {
    return (
      <RSSByTagsView
        searchBarAccessory={<Dropdown defaultValue="tag" onChange={(val) => setView(val as "all" | "tag")} />}
      />
    );
  }

  return (
    <RSSPlainListView
      defaultSearchText={defaultSearchText}
      searchBarAccessory={<Dropdown defaultValue="all" onChange={(val) => setView(val as "all" | "tag")} />}
    />
  );
}
