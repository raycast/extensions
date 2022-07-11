import { List } from "@raycast/api";
import useSWR from "swr";
import fetch from "node-fetch";

export default function LendingRates() {
  const { data = [], isValidating } = useSWR("/api/funding/stats/hist", () =>
    fetch("https://api-pub.bitfinex.com/v2/candles/trade:1h:fUSD:a30:p2:p30/hist").then((r) => r.json() as Promise<any[]>)
  );

  return (
    <List isLoading={isValidating}>
      {data.map((r) => {
        const date = new Date(r[0]);
        const averageRate = r[2] * 100 * 365;

        const lowRate = r[1] * 100 * 365;
        const highRate = r[3] * 100 * 365;

        return (
          <List.Item
            title={date.toLocaleString()}
            key={date.getTime()}
            accessories={[
              {
                text: averageRate.toFixed(2) + '%' + '(avg)',
              },
              {
                text: highRate.toFixed(2) + '%' + '(h)',
              },
              {
                text: lowRate.toFixed(2) + '%' + '(l)',
              },
            ]}
          />
        );
      })}
    </List>
  );
}
