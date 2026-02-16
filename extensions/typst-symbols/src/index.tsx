import { useMemo, useState } from "react";
import SymbolList from "./symbols";
import { ActionPanel, Action, List } from "@raycast/api";
import Fuse, { IFuseOptions } from "fuse.js";

type Item = {
  id: number;
  title: string;
  command: string;
  latex: string;
  subtitle: string;
};

const ITEMS: Item[] = SymbolList.map((value, index) => {
  // Extract LaTeX names (entries starting with \)
  const latexNames = value.descriptions.filter((d) => d.startsWith("\\"));
  return {
    id: index,
    title: value.preview ?? value.command,
    command: value.command,
    latex: latexNames.join(" "),
    subtitle: value.descriptions.join("; "),
  };
});

const FuseOptions: IFuseOptions<Item> = {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  keys: [
    { name: "latex", weight: 3 },
    { name: "command", weight: 2 },
    { name: "title", weight: 1.5 },
    { name: "subtitle", weight: 1 },
  ],
};
const fuse = new Fuse(ITEMS, FuseOptions);

const searchItems = (query: string): Item[] => {
  if (!query) return ITEMS;

  const q = query.toLowerCase();
  const isLatexQuery = query.startsWith("\\");

  // Exact and prefix matching
  const exactMatches: Item[] = [];
  const prefixMatches: Item[] = [];
  const containsMatches: Item[] = [];

  for (const item of ITEMS) {
    const cmdLower = item.command.toLowerCase();
    const latexLower = item.latex.toLowerCase();

    // Check LaTeX matches (high priority for \ queries)
    if (isLatexQuery && latexLower) {
      if (latexLower.includes(q)) {
        if (latexLower === q || latexLower.split(" ").some((l) => l === q)) {
          exactMatches.push(item);
          continue;
        }
        if (latexLower.split(" ").some((l) => l.startsWith(q))) {
          prefixMatches.push(item);
          continue;
        }
        containsMatches.push(item);
        continue;
      }
    }

    // Check command matches
    if (cmdLower === q || item.title.toLowerCase() === q) {
      exactMatches.push(item);
    } else if (cmdLower.startsWith(q)) {
      prefixMatches.push(item);
    } else if (cmdLower.includes(q)) {
      containsMatches.push(item);
    }
  }

  // Sort by length (shorter = more relevant)
  prefixMatches.sort((a, b) => a.command.length - b.command.length);
  containsMatches.sort((a, b) => a.command.length - b.command.length);

  const matched = new Set([
    ...exactMatches.map((i) => i.id),
    ...prefixMatches.map((i) => i.id),
    ...containsMatches.map((i) => i.id),
  ]);

  // Fuzzy search for remaining
  const fuseResults = fuse
    .search(query)
    .filter((r) => !matched.has(r.item.id))
    .map((r) => r.item);

  return [
    ...exactMatches,
    ...prefixMatches,
    ...containsMatches,
    ...fuseResults,
  ];
};

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const filteredList = useMemo(() => searchItems(searchText), [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Symbols"
      searchBarPlaceholder="Search Typst Symbols"
    >
      {filteredList.map((result) => {
        return (
          <List.Item
            key={result.id}
            title={result.title}
            subtitle={result.subtitle}
            accessories={[{ text: result.command }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.command} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
