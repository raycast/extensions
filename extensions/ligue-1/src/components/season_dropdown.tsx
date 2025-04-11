import { Grid, List } from "@raycast/api";

const startYear = 2023;
const endYear = new Date().getFullYear();

const seasons: { season: number; title: string }[] = [];

for (let season = endYear; season >= startYear; season--) {
  const title = `${season}/${season + 1}`;

  seasons.push({ season, title });
}

export default function CompetitionDropdown(props: {
  type?: string;
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  const DropdownComponent =
    props.type === "grid" ? Grid.Dropdown : List.Dropdown;

  return (
    <DropdownComponent
      tooltip="Filter by Competition"
      value={props.selected}
      onChange={props.onSelect}
    >
      {seasons.map((season) => {
        return (
          <DropdownComponent.Item
            key={season.season}
            value={season.season.toString()}
            title={season.title}
          />
        );
      })}
    </DropdownComponent>
  );
}
