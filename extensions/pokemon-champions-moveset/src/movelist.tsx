import { List, Color, environment } from "@raycast/api";
import { useState } from "react";
import movesData from "../assets/moves.json";

interface Move {
  name: string;
  slug: string;
  type: string;
  type_icon: string;
  category: string;
  category_icon: string;
  description: string;
  power: string;
  accuracy: string;
  pp: number;
}

const TYPE_COLORS: Record<string, string> = {
  Bug: "#90c12c",
  Dark: "#5a5465",
  Dragon: "#0f6ac0",
  Electric: "#f3d23b",
  Fairy: "#ef70ef",
  Fighting: "#d04164",
  Fire: "#fd7d24",
  Flying: "#748fc9",
  Ghost: "#556aae",
  Grass: "#63bb5b",
  Ground: "#dd7748",
  Ice: "#74cec0",
  Normal: "#9099a1",
  Poison: "#ab6ac8",
  Psychic: "#f366b9",
  Rock: "#c8b686",
  Steel: "#598fa3",
  Water: "#4592c4",
};

const moves = movesData as Move[];
const assetsPath = environment.assetsPath;

function typeIcon(type: string) {
  return { source: `${assetsPath}/img/type-${type.toLowerCase()}.svg` };
}

function categoryIcon(category: string) {
  return { source: `${assetsPath}/img/category-${category.toLowerCase()}.png` };
}

const ALL_TYPES = [...new Set(moves.map((m) => m.type))].sort();
const ALL_CATEGORIES = ["Physical", "Special", "Status"];

function FilterDropdown({ onChange }: { onChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Filter by Type or Category" onChange={onChange}>
      <List.Dropdown.Item title="All Moves" value="all" />
      <List.Dropdown.Section title="Type">
        {ALL_TYPES.map((type) => (
          <List.Dropdown.Item key={type} title={type} value={`type:${type}`} icon={typeIcon(type)} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Category">
        {ALL_CATEGORIES.map((cat) => (
          <List.Dropdown.Item key={cat} title={cat} value={`category:${cat}`} icon={categoryIcon(cat)} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function buildMarkdown(move: Move): string {
  return `## ${move.name}\n\n${move.description}`;
}

export default function Command() {
  const [filter, setFilter] = useState("all");

  const filtered = moves.filter((m) => {
    if (filter === "all") return true;
    if (filter.startsWith("type:")) return m.type === filter.slice(5);
    if (filter.startsWith("category:")) return m.category === filter.slice(9);
    return true;
  });

  return (
    <List
      isShowingDetail
      searchBarPlaceholder={`Search ${filtered.length} move${filtered.length !== 1 ? "s" : ""}…`}
      searchBarAccessory={<FilterDropdown onChange={setFilter} />}
    >
      {filtered.map((move) => (
        <List.Item
          key={move.slug}
          title={move.name}
          icon={typeIcon(move.type)}
          keywords={[move.type, move.category]}
          accessories={[{ tag: { value: move.type, color: TYPE_COLORS[move.type] ?? Color.SecondaryText } }]}
          detail={
            <List.Item.Detail
              markdown={buildMarkdown(move)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={move.type}
                      icon={typeIcon(move.type)}
                      color={TYPE_COLORS[move.type] ?? Color.SecondaryText}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title="Category"
                    text={move.category}
                    icon={categoryIcon(move.category)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Power" text={move.power === "-" ? "—" : move.power} />
                  <List.Item.Detail.Metadata.Label
                    title="Accuracy"
                    text={move.accuracy === "-" ? "—" : move.accuracy}
                  />
                  <List.Item.Detail.Metadata.Label title="PP" text={String(move.pp)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
