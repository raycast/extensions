import { Detail, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import moment from "moment";
import { TirePressures } from "./types/TirePressures";
import { BASE_URL } from "./utils/constants";

export default function ViewTirePressure() {
  const preferences = getPreferenceValues<{ tessieApiKey: string; VIN: string }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;

  const { isLoading, data } = useFetch<TirePressures>(`${BASE_URL}/${VIN}/tire_pressure`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (isLoading) return <Detail isLoading={true} />;

  if (!data) return <Detail markdown="Failed to fetch historical drives" />;

  const time = data.timestamp ? moment(data.timestamp * 1000).fromNow() : "Unknown";

  function convertResult(bar: number): string {
    const psi = bar * 14.5038;
    return Math.round(psi) + " PSI " + time;
  }

  return (
    <List filtering={false}>
      <List.Item title="Front Left" subtitle={convertResult(data.front_left)} />
      <List.Item title="Front Right" subtitle={convertResult(data.front_right)} />
      <List.Item title="Rear Left" subtitle={convertResult(data.rear_left)} />
      <List.Item title="Rear Right" subtitle={convertResult(data.rear_right)} />
    </List>
  );
}
