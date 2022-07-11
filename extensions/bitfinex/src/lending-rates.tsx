import { useState, useMemo } from 'react'
import { List } from "@raycast/api";
import useSWR from "swr";
import fetch from "node-fetch";

const candlesTimeFrame = {
  '1h': "https://api-pub.bitfinex.com/v2/candles/trade:1h:fUSD:a30:p2:p30/hist",
  '1d': "https://api-pub.bitfinex.com/v2/candles/trade:1D:fUSD:a30:p2:p30/hist",
  '1w': "https://api-pub.bitfinex.com/v2/candles/trade:1W:fUSD:a30:p2:p30/hist",
}

type LendingRatesDropdownProps = {
  onChange: (value: string) => void
}

function LendingRatesDropdown (props: LendingRatesDropdownProps) {
  return <List.Dropdown tooltip="Set rates time frame" storeValue={true} onChange={props.onChange}>
    <List.Dropdown.Item title='by hour'  value="1h" />
    <List.Dropdown.Item title='by day'  value="1d" />
    <List.Dropdown.Item title='by week' value="1w" />
  </List.Dropdown>
}
export default function LendingRates() {
  const [tf, setTf] = useState<keyof typeof candlesTimeFrame>('1h');
  const query = useMemo(() => candlesTimeFrame[tf], [tf]);

  const { data = [], isValidating } = useSWR("/api/funding/stats/hist" + query, () =>
    fetch(query).then((r) => r.json() as Promise<any[]>)
  );

  return (
    <List isLoading={isValidating} searchBarAccessory={<LendingRatesDropdown onChange={value => setTf(value as keyof typeof candlesTimeFrame)} />}>
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
