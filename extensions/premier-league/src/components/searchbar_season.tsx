import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSeasons } from "../api";

export default function SearchBarSeason(props: {
  selected?: string;
  onSelect: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
  const { data: seasons, isLoading } = usePromise(getSeasons);

  return (
    <List.Dropdown
      tooltip="Filter by Season"
      value={props.selected}
      onChange={props.onSelect}
      isLoading={isLoading}
    >
      {seasons?.map((season) => {
        return (
          <List.Dropdown.Item
            key={season.id}
            value={season.id.toString()}
            title={season.label}
          />
        );
      })}
    </List.Dropdown>
  );
}
