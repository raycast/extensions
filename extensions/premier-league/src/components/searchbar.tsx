import { List } from "@raycast/api";

interface Club {
  title: string;
  value: string;
}

export const competitions = [
  {
    title: "Premier League",
    value: "1",
  },
  {
    title: "FA Cup",
    value: "4",
  },
  {
    title: "EFL Cup",
    value: "5",
  },
  {
    title: "UEFA Champions League",
    value: "2",
  },
  {
    title: "UEFA Europa League",
    value: "3",
  },
  {
    title: "UEFA Europa Conference League",
    value: "2247",
  },
];

export default function SearchBarAccessory(props: {
  type: string;
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
  clubs?: Club[];
}) {
  const options =
    props.type === "competition" ? competitions : props.clubs || [];

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
      {options.map(({ title, value }) => {
        return <List.Dropdown.Item key={value} value={value} title={title} />;
      })}
    </List.Dropdown>
  );
}
