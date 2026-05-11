import { useLeagues } from "../hooks/use-leagues";
import { List } from "@raycast/api";

export function LeagueDropdown(props: { value: string; onChange: (value: string) => void }) {
  const { leagues } = useLeagues();

  return (
    <List.Dropdown tooltip="Select League" placeholder="Search League" {...props}>
      {leagues?.map((league) => (
        <List.Dropdown.Item
          key={league.id}
          value={league.id}
          icon={league.image.replace("http://", "https://")}
          title={league.name}
        />
      ))}
    </List.Dropdown>
  );
}
