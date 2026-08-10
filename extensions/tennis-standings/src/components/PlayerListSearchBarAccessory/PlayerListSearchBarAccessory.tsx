import { List } from "@raycast/api";
import { FC } from "react";
import { countries } from "../../data/countries";

type PlayerListSearchBarAccessoryProps = {
  value?: string;
  onFilterByCountry: (countryCode: string) => void;
  playerCountries: Partial<typeof countries>;
};

export const PlayerListSearchBarAccessory: FC<PlayerListSearchBarAccessoryProps> = ({
  value,
  onFilterByCountry,
  playerCountries,
}) => {
  return (
    <List.Dropdown
      placeholder="Filter by country"
      tooltip="Select country"
      value={value || "all"}
      onChange={(val) => {
        onFilterByCountry(val);
      }}
    >
      <List.Dropdown.Item title={`🌍 All countries`} value={"all"} />
      {Object.entries(playerCountries).map(([key, value]) => (
        <List.Dropdown.Item key={key} title={`${value.emoji} ${value.name}`} value={key} />
      ))}
    </List.Dropdown>
  );
};
