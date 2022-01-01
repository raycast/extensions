import {
  ActionPanel,
  ActionPanelItem,
  AlertActionStyle,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  ListSection,
  OpenInBrowserAction,
  SubmitFormAction,
  useNavigation,
} from "@raycast/api";
import { ChainId, ComplexProtocol, Token } from "@yukaii/debank-types";
import { useEffect, useMemo, useState } from "react";
import { getComplexProtocolList, getTotalBalance, TotalBalance } from "./api";
import useFavoriteAddresses from "./utils/useFavoriteAddresses";

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

  const { loading, favoriteAddresses, addFavoriteAddress, removeFavoriteAddress } = useFavoriteAddresses();
  const { pop } = useNavigation();

  const defaultItem = (
    <List.Item
      title={title}
      actions={
        address && (
          <ActionPanel>
            <ActionPanelItem
              title={`Show Balance`}
              icon={Icon.Binoculars}
              onAction={() => {
                push(<BalanceView address={address} />);
              }}
            />
            <OpenInBrowserAction url={`https://debank.com/profile/${address}`} title="Open on DeBank" />
            {!favoriteAddresses.find((add) => address && add.address === address) && (
              <ActionPanelItem
                title={`Add to Favorites`}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => {
                  push(
                    <AddFavoriteAddressForm
                      address={address}
                      onSubmit={({ address, identifier }) => {
                        addFavoriteAddress(address, identifier);
                        pop();
                      }}
                    />
                  );
                }}
              />
            )}
          </ActionPanel>
        )
      }
    />
  );

  return (
    <List onSearchTextChange={onChange}>
      {loading || favoriteAddresses.length === 0 ? (
        defaultItem
      ) : (
        <>
          <ListSection title="Favorites">
            {favoriteAddresses.map((address) => (
              <List.Item
                key={address.address}
                title={address.identifier || address.address}
                accessoryTitle={!address.identifier ? "" : address.address}
                icon={{
                  source: Icon.Star,
                  tintColor: Color.Yellow,
                }}
                actions={
                  <ActionPanel>
                    <ActionPanelItem
                      title={`Show Balance`}
                      icon={Icon.Binoculars}
                      onAction={() => {
                        push(<BalanceView address={address.address} />);
                      }}
                    />
                    <OpenInBrowserAction url={`https://debank.com/profile/${address.address}`} title="Open on DeBank" />
                    <ActionPanelItem
                      title={`Remove from Favorites`}
                      icon={Icon.Star}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={async () => {
                        confirmAlert({
                          title: "Confirm Removal",
                          message: `Are you sure you want to remove "${
                            address.identifier || address.address
                          }" from your favorites?`,
                          primaryAction: {
                            title: "Remove",
                            style: AlertActionStyle.Destructive,
                            onAction: () => removeFavoriteAddress(address.address),
                          },
                        });
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </ListSection>

          <ListSection title="Search for Address">{defaultItem}</ListSection>
        </>
      )}
    </List>
  );
}

type AddFavoriteAddressFormProps = {
  address: string;
  onSubmit: (values: any) => void;
};

function AddFavoriteAddressForm(props: AddFavoriteAddressFormProps) {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Add to Favorites" onSubmit={props.onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Address" id="address" defaultValue={props.address} />
      <Form.TextField title="Identifier" id="identifier" />
    </Form>
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
      <List navigationTitle={`Account Balance of ${props.address}`}>
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
                  icon={{
                    source: chain.logo_url,
                  }}
                  actions={
                    <ActionPanel>
                      <ActionPanelItem
                        title={`Show Protocols on ${chain.name}`}
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

function formatTokenList(tokens?: Token[]) {
  return tokens?.map((token) => `${token.amount.toFixed(2)} ${token.optimized_symbol}`).join(", ") || "";
}

export function ComplexProtocolView(props: ComplexProtocolViewProps) {
  const [protocols, setProtocols] = useState<ComplexProtocol[] | null>(null);

  useEffect(() => {
    if (props.address && props.chainId) {
      getComplexProtocolList(props.address, props.chainId).then((data) => {
        setProtocols(data);
      });
    }
  }, []);

  if (!protocols) {
    return (
      <List>
        <List.Item key="1" title="Loading..." />
      </List>
    );
  } else if (protocols.length === 0) {
    return (
      <List>
        <List.Item key="1" title="No Protocols" />
      </List>
    );
  } else {
    return (
      <List navigationTitle={`${props.chainName} Protocols`}>
        {protocols.map((protocol) => {
          return (
            <List.Section title={`${protocol.name}`}>
              {protocol.portfolio_item_list.map((item) => {
                const balance = formatTokenList(item.detail.supply_token_list);
                const rewarded = formatTokenList(item.detail.reward_token_list);

                return (
                  <List.Item
                    icon={
                      protocol.logo_url
                        ? {
                            source: protocol.logo_url,
                          }
                        : Icon.QuestionMark
                    }
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
