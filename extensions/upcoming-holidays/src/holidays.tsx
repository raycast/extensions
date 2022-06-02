import { List } from "@raycast/api";
import clm from "country-locale-map";
import { Country } from "./country";

export default function Command() {
  const countries = clm.getAllCountries();

  return (
    <List isLoading={!countries} isShowingDetail={true}>
      {countries &&
        countries.map((country) => {
          const props: Partial<List.Item.Props> = {
            detail: <Country countryCode={country.alpha2} />,
          };
          return <List.Item key={country.alpha2} title={country.name} icon={country.emoji} {...props} />;
        })}
    </List>
  );
}
