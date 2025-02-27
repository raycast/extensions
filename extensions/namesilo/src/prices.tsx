import { Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { Price } from "./lib/types";
import { useMemo, useState } from "react";

export default function Prices() {
  const [sort, setSort] = useState("");
  const { isLoading, data } = useNameSilo<{ [key: string]: Price }>("getPrices");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const prices = !data ? {} : (({ code: _code, detail: _detail, ...rest }) => rest)(data);
  // The above is done as response is like
  // { code: 300, detail: "success", ac: Price, .... }
  // so we remove code, detail

  const sortedPrices = useMemo(() => {
    return !sort
      ? prices
      : Object.fromEntries(
          Object.entries(prices).sort(([, priceA], [, priceB]) => {
            if (sort === "lowest_registration") return Number(priceA.registration) - Number(priceB.registration);
            if (sort === "lowest_renewal") return Number(priceA.renew) - Number(priceB.renew);
            if (sort === "lowest_transfer") return Number(priceA.transfer) - Number(priceB.transfer);
            return 0;
          }),
        );
  }, [sort]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search price"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" onChange={setSort}>
          <List.Dropdown.Item title="NameSilo Sort (default)" value="" />
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Lowest Registration (ASC)" value="lowest_registration" />
            <List.Dropdown.Item title="Lowest Renewal (ASC)" value="lowest_renewal" />
            <List.Dropdown.Item title="Lowest Transfer (ASC)" value="lowest_transfer" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={Object.keys(prices).length + " prices"}>
        {Object.entries(sortedPrices).map(([tld, price]) => (
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
