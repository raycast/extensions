import { Grid, List } from "@raycast/api";

const startYear = 2023;
const endYear = new Date().getFullYear();

const seasons: { season: number; title: string }[] = [];

for (let season = endYear; season >= startYear; season--) {
  const title = `${season}/${season + 1}`;

  seasons.push({ season, title });
}

const competitions = [
  {
    title: "Ligue 1 McDonald's",
    value: "1",
    icon: "ligue1.png",
  },
  {
    title: "Ligue 2 BKT",
    value: "4",
    icon: "ligue2.png",
  },
];

export { seasons };

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
          <DropdownComponent.Section title={season.title} key={season.season}>
            {competitions.map((competition) => {
              return (
                <DropdownComponent.Item
                  key={`${season.season}_${competition.value}`}
                  value={`${season.season}_${competition.value}`}
                  title={`${competition.title} ${season.title}`}
                  icon={competition.icon}
                />
              );
            })}
          </DropdownComponent.Section>
        );
      })}
    </DropdownComponent>
  );
}
