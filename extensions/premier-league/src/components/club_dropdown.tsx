import { List } from "@raycast/api";

export const clubs = [
  { title: "Arsenal", value: "1" },
  { title: "Aston Villa", value: "2" },
  { title: "Brentford", value: "130" },
  { title: "Brighton and Hove Albion", value: "131" },
  { title: "Burnley", value: "43" },
  { title: "Chelsea", value: "4" },
  { title: "Crystal Palace", value: "6" },
  { title: "Everton", value: "7" },
  { title: "Leeds United", value: "9" },
  { title: "Leicester City", value: "26" },
  { title: "Liverpool", value: "10" },
  { title: "Manchester City", value: "11" },
  { title: "Manchester United", value: "12" },
  { title: "Newcastle United", value: "23" },
  { title: "Norwich City", value: "14" },
  { title: "Southampton", value: "20" },
  { title: "Tottenham Hotspur", value: "21" },
  { title: "Watford", value: "33" },
  { title: "West Ham United", value: "25" },
  { title: "Wolverhampton Wanderers", value: "38" },
];

export default function ClubDropdown(props: {
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <List.Dropdown tooltip="Filter by Club" onChange={props.onSelect}>
      <List.Dropdown.Section>
        <List.Dropdown.Item key="-1" value="-1" title="All Clubs" />
        {clubs.map((clubs) => {
          return (
            <List.Dropdown.Item
              key={clubs.value}
              value={clubs.value}
              title={clubs.title}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
