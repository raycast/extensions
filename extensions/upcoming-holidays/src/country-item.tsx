import { Action, ActionPanel, List } from "@raycast/api";
import { Country, CountryDetail } from "./country-detail";

export const CountryItem = ({
  country,
  action,
  dateRange,
}: {
  country: Country;
  action: { title: string; handler: () => void };
  dateRange?: import("./country-detail").DateRange;
}) => {
  return (
    <List.Item
      title={country.name}
      icon={country.emoji}
      detail={<CountryDetail countryCode={country.alpha2} dateRange={dateRange} />}
      actions={
        <ActionPanel>
          <Action title={action.title} onAction={action.handler} />
        </ActionPanel>
      }
    />
  );
};
