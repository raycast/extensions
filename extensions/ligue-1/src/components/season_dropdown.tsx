import { Grid, List } from "@raycast/api";

const startYear = 1993;
const endYear = new Date().getFullYear();

const seasons: { [key: string]: { [key: string]: string } } = {};

for (let year = endYear; year >= startYear; year--) {
  const decade = `${Math.floor(year / 10) * 10}s`;
  const seasonKey = `${year}-${year + 1}`;
  const seasonValue = `${year}/${year + 1}`;

  if (!seasons[decade]) {
    seasons[decade] = {};
  }

  seasons[decade][seasonKey] = seasonValue;
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
      {Object.entries(seasons).map(([annees, years]) => {
        return (
          <DropdownComponent.Section title={annees} key={annees}>
            {Object.entries(years).map(([key, value]) => {
              return (
                <DropdownComponent.Item
                  key={key}
                  value={key}
                  title={value}
                  // title={competition.title}
                />
              );
            })}
          </DropdownComponent.Section>
        );
      })}
    </DropdownComponent>
  );
}
