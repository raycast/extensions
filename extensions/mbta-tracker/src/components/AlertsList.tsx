import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { AlertsResponse } from "../types";
import { appendApiKey } from "../utils";

interface Props {
  alertIds?: string[];
}

export const AlertsList = ({ alertIds }: Props): JSX.Element => {
  const { data } = useFetch<AlertsResponse>(
    appendApiKey(
      `https://api-v3.mbta.com/alerts?filter%5Bid%5D=${alertIds?.toString()}&fields%5Balert%5D=description,header,lifecycle,timeframe`
    )
  );

  return (
    <List.Section title="Alerts">
      {data?.data.map((alert) => (
        <List.Item
          key={alert.id}
          title={alert.attributes.header}
          subtitle={{
            tooltip: alert.attributes.header + "\n\n" + alert.attributes.description,
            value: alert.attributes.description,
          }}
          accessories={[{ tag: { value: alert.attributes.lifecycle }, tooltip: alert.attributes.timeframe }]}
        />
      ))}
    </List.Section>
  );
};
