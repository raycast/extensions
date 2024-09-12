import { Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { Price } from "./lib/types";

export default function Prices() {
  const { isLoading, data } = useNameSilo<{ [key: string]: Price }>("getPrices");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const prices = !data ? {} : (({ code: _code, detail: _detail, ...rest }) => rest)(data);
  // The above is done as response is like
  // { code: 300, detail: "success", ac: Price, .... }
  // so we remove code, detail

  return (
    <List isLoading={isLoading}>
      <List.Section title={Object.keys(prices).length + " prices"}>
        {Object.entries(prices).map(([tld, price]) => (
          <List.Item
            key={tld}
            icon={Icon.Dot}
            title={tld}
            accessories={[
              { text: `renew: ${price.renew}` },
              { text: `registration: ${price.registration}` },
              { text: `transfer: ${price.transfer}` },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
