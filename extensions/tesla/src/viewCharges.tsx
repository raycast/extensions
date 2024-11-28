import { Color, Detail, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Distance } from "./types/Distance";
import { HistoricalCharge } from "./types/HistoricalCharge";
import { BASE_URL } from "./utils/constants";
import { getDistance, getElapsedTime } from "./utils/utils";

export default function Command() {
  const preferences = getPreferenceValues<{ tessieApiKey: string; VIN: string; distance: Distance }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;
  const distanceType = preferences.distance;

  const { isLoading, data } = useFetch<{ results: HistoricalCharge[] }>(
    `${BASE_URL}/${VIN}/charges?distance_format=mi&format=json&superchargers_only=false&exclude_origin=true&timezone=UTC`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  );

  if (isLoading) return <Detail isLoading={true} />;

  if (!data) return <Detail markdown="Failed to fetch historical charges" />;

  function formatDollar(amount: number | null): string {
    if (amount == 0) return "Free";

    if (amount !== null)
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return "Amount is null";
  }

  return (
    <List>
      {data.results.map((charge) => (
        <List.Item
          key={charge.id}
          title={`${charge.starting_battery}% - ${charge.ending_battery}% (${getDistance(
            charge.miles_added,
            distanceType
          ).toFixed(2)} ${distanceType})`}
          subtitle={getElapsedTime(charge.started_at, charge.ended_at)}
          accessories={[
            {
              tag: {
                value: formatDollar(charge.cost),
                color: Color.Green,
              },
            },
            charge.is_supercharger ? { tag: { value: "Supercharger", color: Color.Red } } : {},
          ]}
        />
      ))}
    </List>
  );
}
