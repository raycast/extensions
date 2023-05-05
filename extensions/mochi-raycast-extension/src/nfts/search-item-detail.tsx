import { List } from "@raycast/api";
import { changeIcon, formatCurrency, formatNumber } from "../utils";
import { useNftCollectionTicker } from "../apis";

type SearchItemNFTDetailProps = {
  address: string;
};

export default function SearchItemNFTDetail({ address }: SearchItemNFTDetailProps) {
  const { data, isLoading } = useNftCollectionTicker(address);
  const isEmpty = !data?.data && !isLoading;

  const price_change_1d = parseFloat(data?.data?.price_change_1d ?? "0");
  const price_change_7d = parseFloat(data?.data?.price_change_7d ?? "0");
  const price_change_30d = parseFloat(data?.data?.price_change_30d ?? "0");

  if (isEmpty) {
    return <List.Item.Detail markdown={`No data`} />;
  }

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={`<img width='40' height='40' src="${data?.data.collection_image}"/>`}
      metadata={
        !isLoading ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={data?.data?.name} />
            <List.Item.Detail.Metadata.Label title="Item" text={data?.data?.items.toString()} />
            <List.Item.Detail.Metadata.Label title="Owner" text={data?.data?.owners.toString()} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title={`Volume (${data?.data?.chain?.symbol})`}
              text={
                data?.data?.total_volume?.token.decimals
                  ? formatCurrency(parseFloat(data?.data?.total_volume?.amount ?? "0"))
                  : "-"
              }
            />
            <List.Item.Detail.Metadata.Label
              title={`Floor price (${data?.data?.chain?.symbol})`}
              text={formatCurrency(
                parseFloat(data?.data?.floor_price?.amount ?? "") /
                  10 ** (data?.data?.floor_price?.token?.decimals ?? 0)
              )}
            />
            <List.Item.Detail.Metadata.Label
              title={`Last sale (${data?.data?.chain?.symbol})`}
              text={formatCurrency(
                parseFloat(data?.data?.last_sale_price?.amount ?? "") /
                  10 ** (data?.data?.last_sale_price?.token?.decimals ?? 0)
              )}
            />
            <List.Item.Detail.Metadata.Label
              icon={changeIcon(price_change_1d)}
              title="Change (24h)"
              text={formatNumber(Number(price_change_1d.toString()))}
            />
            <List.Item.Detail.Metadata.Label
              icon={changeIcon(price_change_7d)}
              title="Change (7d)"
              text={formatNumber(Number(price_change_7d.toString()))}
            />
            <List.Item.Detail.Metadata.Label
              icon={changeIcon(price_change_30d)}
              title="Change (1M)"
              text={formatNumber(Number(price_change_30d.toString()))}
            />
          </List.Item.Detail.Metadata>
        ) : null
      }
    />
  );
}
