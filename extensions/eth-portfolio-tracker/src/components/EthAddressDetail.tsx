import { List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getEthBalance, formatEthBalance, formatDollarValue, EthAddressBalance } from "../api/ethereum";

interface EthAddressDetailProps {
  address: string;
  name: string;
}

export function EthAddressDetail({ address, name }: EthAddressDetailProps) {
  const [balance, setBalance] = useState<EthAddressBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const ethBalance = await getEthBalance(address);
      setBalance(ethBalance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const ethBalance = balance ? formatEthBalance(balance.eth.balance) : "Unknown";
  const dollarValue = balance ? formatDollarValue(balance.eth.dollarValue) : "Unknown";

  const markdown = isLoading
    ? "# Loading..."
    : `
# ${dollarValue}
## ${ethBalance}
**Address:** \`${address}\`
${error ? `\n**Error fetching balance:** ${error}\n` : ""}
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
          <List.Item.Detail.Metadata.Label title="Eth Price" text={`${balance?.ethPrice}`} />
          <List.Item.Detail.Metadata.Label title="Address" text={address} />
          <List.Item.Detail.Metadata.Label title="Name" text={name} />
          <List.Item.Detail.Metadata.Label title="Token" text="Ethereum" />
          <List.Item.Detail.Metadata.Label title="RPC Endpoint" text={balance?.rpcEndpoint} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
