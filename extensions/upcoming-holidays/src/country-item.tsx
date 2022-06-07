import { Action, ActionPanel, List } from "@raycast/api";
import { Country, CountryDetail } from "./country-detail";

export const CountryItem = ({
  country,
  action,
}: {
  country: Country;
  action: { title: string; handler: () => void };
}) => {
  return (
    <List.Item
      title={country.name}
      icon={country.emoji}
      detail={<CountryDetail countryCode={country.alpha2} />}
      actions={
        <ActionPanel>
          <Action title={action.title} onAction={action.handler} />
        </ActionPanel>
      }
    />
  );
};
