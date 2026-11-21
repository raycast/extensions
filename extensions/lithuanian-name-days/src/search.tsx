import { List } from "@raycast/api";
import { useState } from "react";
import { searchNames } from "./lib/data";
import { NameActions } from "./lib/ui";

export default function Command() {
  const [query, setQuery] = useState("");
  const results = searchNames(query);
  return (
    <List onSearchTextChange={setQuery} searchBarPlaceholder="Type a name, e.g. Ona or Zydrunas" filtering={false}>
      {query.trim() === "" ? (
        <List.EmptyView title="Search a Name" description="Diacritics are optional (Žydrūnas = Zydrunas)." />
      ) : results.length === 0 ? (
        <List.EmptyView title="No Name Found" description="Try a shorter or nominative form of the name." />
      ) : (
        results.map((r) => (
          <List.Item
            key={r.name}
            title={r.name}
            accessories={[{ text: r.days.map((d) => d.label).join(" · ") }]}
            actions={<NameActions names={[r.name]} extra={r.days.map((d) => d.label).join(", ")} />}
          />
        ))
      )}
    </List>
  );
}
