import { Action, ActionPanel } from "@raycast/api";
import { useMemo, useState } from "react";
import { getCountries } from "./countries";
import { CountryDetails } from "./flag-lookup";

export default function RandomFlagCommand() {
  const countries = useMemo(() => getCountries(), []);
  const [seed, setSeed] = useState(0);
  const country = useMemo(() => countries[Math.floor(Math.random() * countries.length)], [countries, seed]);

  return (
    <CountryDetails
      country={country}
      countries={countries}
      extraActions={
        <ActionPanel.Section>
          <Action title="Show Another Random Flag" onAction={() => setSeed((current) => current + 1)} />
        </ActionPanel.Section>
      }
    />
  );
}
