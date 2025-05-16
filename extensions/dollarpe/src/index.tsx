import { Icon, MenuBarExtra, open } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";

type DataResponse = [
  string,
  {
    buy: number;
    sell: number;
    pageUrl: string;
  }
];

export default function Command() {
  const { isLoading, data } = useFetch<DataResponse[]>("https://dollarpe-api.cristianbgp.com/exchanges");

  return (
    <MenuBarExtra icon={Icon.Coins} isLoading={isLoading}>
      {data?.map(([name, { buy, sell, pageUrl }], index) => (
        <MenuBarExtra.Section key={name}>
          <MenuBarExtra.Item icon={getFavicon(pageUrl)} title={name} onAction={() => open(pageUrl)} />
          <MenuBarExtra.Section title="Buy" />
          <MenuBarExtra.Item title={buy.toString()} />
          <MenuBarExtra.Section title="Sell" />
          <MenuBarExtra.Item title={sell.toString()} />
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra>
  );
}
