import { useState, useMemo } from "react";
import { List } from "@raycast/api";
import useSWR from "swr";
import fetch from "node-fetch";
import { getCurrency } from "./preference";

// ['1m', '5m', '15m', '30m', '1h', '3h', '6h', '12h', '1D', '1W', '14D', '1M']
const tfOptions = [
  ["1m", "1 min"],
  ["5m", "5 min"],
  ["15m", "15 min"],
  ["30m", "30 min"],
  ["1h", "1 hour"],
  ["3h", "3 hours"],
  ["6h", "6 hours"],
  ["12h", "12 hours"],
  ["1D", "1 day"],
  ["1W", "1 week"],
  ["14D", "2 weeks"],
  ["1M", "1 month"],
];

const candlesTimeFrame: Record<string, string> = tfOptions.reduce(
  (acc, tf) => ({
    ...acc,
    [tf[0]]: `https://api-pub.bitfinex.com/v2/candles/trade:${tf[0]}:${getCurrency()}:a30:p2:p30/hist`,
  }),
  {}
);

type LendingRatesDropdownProps = {
  onChange: (value: string) => void;
};

function LendingRatesDropdown(props: LendingRatesDropdownProps) {
  return (
    <List.Dropdown tooltip="Set rates time frame" storeValue={true} onChange={props.onChange}>
      {tfOptions.map(([value, label]) => (
        <List.Dropdown.Item key={value} title={label} value={value} />
      ))}
    </List.Dropdown>
  );
}
export default function LendingRates() {
  const [tf, setTf] = useState<keyof typeof candlesTimeFrame>("1h");
  const query = useMemo(() => candlesTimeFrame[tf], [tf]);

  const { data = [], isValidating } = useSWR("/api/funding/stats/hist" + query, () =>
    fetch(query).then((r) => r.json() as Promise<any[]>)
  );

  return (
    <List
      isLoading={isValidating}
      searchBarAccessory={<LendingRatesDropdown onChange={(value) => setTf(value as keyof typeof candlesTimeFrame)} />}
    >
      <List.Section title={`Lending Rates for ${getCurrency()}`}>
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
                  text: averageRate.toFixed(2) + "%" + "(avg)",
                },
                {
                  text: highRate.toFixed(2) + "%" + "(hi)",
                },
                {
                  text: lowRate.toFixed(2) + "%" + "(lo)",
                },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
