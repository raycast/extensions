import { List } from "@raycast/api";

export const competitions = [
  {
    title: "Premier League",
    value: "8",
  },
  {
    title: "FA Cup",
    value: "1",
  },
  {
    title: "EFL Cup",
    value: "2",
  },
  {
    title: "UEFA Champions League",
    value: "5",
  },
  {
    title: "UEFA Europa League",
    value: "6",
  },
  {
    title: "UEFA Europa Conference League",
    value: "1125",
  },
  {
    title: "Summer Series",
    value: "1211",
  },
];

export default function SearchBarCompetition(props: {
  type: string;
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
  data: { title: string; value: string }[];
}) {
  return (
    <List.Dropdown
      tooltip={
        props.type === "competition"
          ? "Filter by Competition"
          : "Filter by Club"
      }
      value={props.selected}
      onChange={props.onSelect}
    >
      {props.data.map(({ title, value }) => {
        return <List.Dropdown.Item key={value} value={value} title={title} />;
      })}
    </List.Dropdown>
  );
}
