import { List } from "@raycast/api";

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
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <List.Dropdown
      tooltip="Filter by Competition"
      value={props.selected}
      onChange={props.onSelect}
    >
      <List.Dropdown.Section>
        {competitions.map((competition) => {
          return (
            <List.Dropdown.Item
              key={competition.value}
              value={competition.value}
              title={competition.title}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
