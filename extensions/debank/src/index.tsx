import { ActionPanel, ActionPanelItem, List, ListSection, OpenInBrowserAction, useNavigation } from "@raycast/api";
import { ChainId, ComplexProtocol } from "@yukaii/debank-types";
import { useEffect, useMemo, useState } from "react";
import { getComplexProtocolList, getTotalBalance, TotalBalance } from "./api";

export default function Command() {
  const [address, setAddress] = useState("");
  const onChange = (value: string) => setAddress(value);
  const { push } = useNavigation();

  const title = useMemo(() => {
    if (!address) {
      return "Enter Wallet Address";
    } else {
      return "Press Enter to Search";
    }
  }, [address]);

  return (
    <List onSearchTextChange={onChange}>
      <List.Item
        title={title}
        actions={
          address && (
            <ActionPanel>
              <ActionPanelItem
                title={`Show Balance`}
                onAction={() => {
                  push(<BalanceView address={address} />);
                }}
              />
              <OpenInBrowserAction url={`https://debank.com/profile/${address}`} title="Open on DeBank" />
            </ActionPanel>
          )
        }
      />
    </List>
  );
}

type BalanceViewProps = {
  address: string;
};

export function BalanceView(props: BalanceViewProps) {
  const [balance, setBalance] = useState<TotalBalance | null>(null);

  useEffect(() => {
    if (props.address) {
      getTotalBalance(props.address).then((data) => {
        setBalance(data);
      });
    }
  }, []);

  const { push } = useNavigation();

  if (!balance) {
    return (
      <List>
        <List.Item key="1" title="Loading..." />
      </List>
    );
  } else {
    return (
      <List>
        <ListSection title="Total">
          <List.Item key="1" title="Total Balance" accessoryTitle={`$${balance.total_usd_value.toFixed(2)}`} />
        </ListSection>

        <ListSection title="Chain">
          {balance.chain_list
            .filter((chain) => chain.usd_value > 0)
            .map((chain) => {
              return (
                <List.Item
                  key={chain.id}
                  title={chain.name}
                  accessoryTitle={`$${chain.usd_value.toFixed(2)}`}
                  actions={
                    <ActionPanel>
                      <ActionPanelItem
                        title={`Show ${chain.name}`}
                        onAction={() => {
                          push(
                            <ComplexProtocolView address={props.address} chainId={chain.id} chainName={chain.name} />
                          );
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
        </ListSection>
      </List>
    );
  }
}

type ComplexProtocolViewProps = {
  address: string;
  chainId: ChainId;
  chainName: string;
};

export function ComplexProtocolView(props: ComplexProtocolViewProps) {
  const [protocols, setProtocols] = useState<ComplexProtocol[] | null>(null);

  useEffect(() => {
    if (props.address && props.chainId) {
      getComplexProtocolList(props.address, props.chainId).then((data) => {
        setProtocols(data);
      });
    }
  }, []);

  if (!protocols || protocols.length === 0) {
    return (
      <List>
        <List.Item key="1" title="Loading..." />
      </List>
    );
  } else {
    return (
      <List navigationTitle={`${props.chainName} Protocols`}>
        {protocols.map((protocol) => {
          return (
            <List.Section title={`${protocol.name}`}>
              {protocol.portfolio_item_list.map((item) => {
                const balance =
                  item.detail.supply_token_list
                    ?.map((token) => `${token.amount.toFixed(2)} ${token.optimized_symbol}`)
                    .join(", ") || "";

                const rewarded =
                  item.detail.reward_token_list
                    ?.map((token) => `${token.amount.toFixed(2)} ${token.optimized_symbol}`)
                    .join(", ") || "";

                return (
                  <List.Item
                    key={`${protocol.id}-${item.name}`}
                    title={item.name}
                    subtitle={`${balance}${rewarded && ` | (${rewarded})`}`}
                    accessoryTitle={`$${item.stats.net_usd_value.toFixed(2)}`}
                  />
                );
              })}
            </List.Section>
          );
        })}
      </List>
    );
  }
}
