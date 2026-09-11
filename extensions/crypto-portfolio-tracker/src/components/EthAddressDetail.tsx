import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getEthBalance, formatEthBalance, formatDollarValue } from "../api/ethereum";

interface EthAddressDetailProps {
  address: string;
  name: string;
}

export function EthAddressDetail({ address, name }: EthAddressDetailProps) {
  const { data: balance, isLoading, error } = useCachedPromise(getEthBalance, [address]);

  const ethBalance = balance ? formatEthBalance(balance.eth.balance) : "Unknown";
  const dollarValue = balance ? formatDollarValue(balance.eth.dollarValue) : "Unknown";
  const ethPrice = balance ? formatDollarValue(balance.ethPrice) : "Unknown";
  const rpcEndpoint = balance?.rpcEndpoint ?? "Unknown";

  const markdown = isLoading
    ? "# Loading..."
    : `
# ${dollarValue}
## ${ethBalance}
**Address:** \`${address}\`
${error ? `\n**Error fetching balance:** ${error instanceof Error ? error.message : String(error)}\n` : ""}
`;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Dollar Value" text={dollarValue} />
          <List.Item.Detail.Metadata.Label title="Eth Balance" text={ethBalance} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Eth Price" text={ethPrice} />
          <List.Item.Detail.Metadata.Label title="Address" text={address} />
          <List.Item.Detail.Metadata.Label title="Name" text={name} />
          <List.Item.Detail.Metadata.Label title="Token" text="Ethereum" />
          <List.Item.Detail.Metadata.Label title="RPC Endpoint" text={rpcEndpoint} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
