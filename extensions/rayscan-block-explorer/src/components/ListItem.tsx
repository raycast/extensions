import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { TokenType, ChainData } from "../types";
import utils from "../utils";

type Props = {
  type?: TokenType;
  token?: string;
  chain: ChainData;
};

export default function ListItem({ type, token, chain }: Props) {
  return (
    <List.Item
      icon={chain.icon}
      title={(token && type) ? `${type}:${utils.shrinkText(token!)} on ${chain.name}` : chain.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={utils.getExplorerUrl(type, token, chain.blockExplorerUrl)} />
          {/* <Action.Push title="Show Details" target={<Detail markdown={chain.blockExplorerUrl} />} /> */}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail metadata={
          <Metadata type={type} token={token} chain={chain} />
        } />
      } />
  );
};

function Metadata({ type, token, chain }: Props) {
  if (type === TokenType.Address) {
    return <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Address" text={token} />
      <List.Item.Detail.Metadata.Label title="Chain" text={chain.name} />
      <List.Item.Detail.Metadata.Label title="ChainID" text={{ value: chain.chainId.toString() }} />
      <List.Item.Detail.Metadata.Label title="Native Currency" text={chain.nativeCurrency.symbol} icon={chain.nativeCurrency.icon} />
      <List.Item.Detail.Metadata.Label title="Block Explorer" text={chain.blockExplorerName} />
    </List.Item.Detail.Metadata>
  } else if (type === TokenType.Tx) {
    return <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="TransactionID" text={token} />
      <List.Item.Detail.Metadata.Label title="Chain" text={chain.name} />
      <List.Item.Detail.Metadata.Label title="ChainID" text={{ value: chain.chainId.toString() }} />
      <List.Item.Detail.Metadata.Label title="Native Currency" text={chain.nativeCurrency.symbol} icon={chain.nativeCurrency.icon} />
      <List.Item.Detail.Metadata.Label title="Block Explorer" text={chain.blockExplorerName} />
    </List.Item.Detail.Metadata>
  } else if (type === TokenType.BlockNumber || type === TokenType.BlockHash) {
    return <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Block" text={token} />
      <List.Item.Detail.Metadata.Label title="Chain" text={chain.name} />
      <List.Item.Detail.Metadata.Label title="ChainID" text={{ value: chain.chainId.toString() }} />
      <List.Item.Detail.Metadata.Label title="Native Currency" text={chain.nativeCurrency.symbol} icon={chain.nativeCurrency.icon} />
      <List.Item.Detail.Metadata.Label title="Block Explorer" text={chain.blockExplorerName} />
    </List.Item.Detail.Metadata>
  }
  return <List.Item.Detail.Metadata>
    <List.Item.Detail.Metadata.Label title="Chain" text={chain.name} />
    <List.Item.Detail.Metadata.Label title="ChainID" text={{ value: chain.chainId.toString() }} />
    <List.Item.Detail.Metadata.Label title="Native Currency" text={chain.nativeCurrency.symbol} icon={chain.nativeCurrency.icon} />
    <List.Item.Detail.Metadata.Label title="Block Explorer" text={chain.blockExplorerName} />
  </List.Item.Detail.Metadata>
}