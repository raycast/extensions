import { Grid, List } from "@raycast/api";

export const competitions = [
  {
    title: "LaLiga Santander 2021/22",
    value: "laliga-santander-2021",
  },
  {
    title: "LaLiga SmartBank 2021/22",
    value: "laliga-smartbank-2021",
  },
  {
    title: "Women's First Division 2021/22",
    value: "primera-division-femenina-2021",
  },
];

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
      <DropdownComponent.Section>
        {competitions.map((competition) => {
          return (
            <DropdownComponent.Item
              key={competition.value}
              value={competition.value}
              title={competition.title}
            />
          );
        })}
      </DropdownComponent.Section>
    </DropdownComponent>
  );
}
