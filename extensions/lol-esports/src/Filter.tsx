import { Image, List } from "@raycast/api";
import { League } from "./types";
import { getIcon } from "./utils";

type Props = {
  leagueList: League[] | undefined;
  handleChange: (v: string) => void;
};

function Filter({ leagueList, handleChange }: Props) {
  return (
    <List.Dropdown onChange={handleChange} tooltip="Select Filter">
      <List.Dropdown.Item title="All" value="all" />
      {leagueList?.map((league) => (
        <List.Dropdown.Item
          key={league.id}
          title={league.name}
          value={league.id}
          icon={{ source: getIcon(league.image), mask: Image.Mask.Circle }}
        />
      ))}
    </List.Dropdown>
  );
}

export default Filter;
