import { useEffect, useState } from "react";
import { Network, OperationData, TokenData } from "./Types/types";
import { List } from "@raycast/api";
import EmptyView from "./Components/UserAccountEmptyview";
import { fetchBalanceAndTokens } from "./Api/api";

type State = {
    network: Network;
    isFetching: boolean;
    searchText: string;
    balance: string | null;
    firstActivityTime: string | null;
    lastActivityTime: string | null;
    tokens: Array<TokenData> | null;
    domain: string | null;
    operations: Array<OperationData> | null;
    error: string | null;
};

export default function SearchAccount() {
    const [state, setState] = useState<State>({
        network: Network.Mainnet,
        isFetching: false,
        searchText: "",
        balance: null,
        firstActivityTime: null,
        lastActivityTime: null,
        tokens: null,
        domain: null,
        operations: null,
        error: null,
    });

    interface FlattenedTokenData {
        balance: string;
        "token.contract.address": string;
        "token.tokenId": string;
        "token.metadata.name": string;
        "token.metadata.symbol": string;
        "token.metadata.decimals": string;
        "token.metadata.displayUri": string;
        "token.metadata.artifactUri": string;
        "token.metadata.thumbnailUri": string;
    }

    useEffect(() => {
        if (state.searchText !== "") {
            setState((prev) => ({ ...prev, isFetching: true }));
            fetchBalanceAndTokens(state.searchText, state.network)
                .then((data) => {
                    const formattedBalance = data.balance ? parseFloat(data.balance).toFixed(2) : null;
                    const firstActivity = data.firstActivityTime ? new Date(data.firstActivityTime).toLocaleString() : null;
                    const lastActivity = data.lastActivityTime ? new Date(data.lastActivityTime).toLocaleString() : null;
                    const formattedOperations = data.operations
                        ? data.operations.map((op) => ({
                            timestamp: new Date(op.timestamp).toLocaleString(),
                            target: {
                                alias: op.targetAlias,
                                address: op.targetAddress,
                            },
                        }))
                        : null;
                    setState((prev) => {
                        return {
                            ...prev,
                            balance: formattedBalance,
                            firstActivityTime: firstActivity,
                            lastActivityTime: lastActivity,
                            tokens: data.tokens,
                            domain: data.domain,
                            operations: formattedOperations,
                            isFetching: false,
                        };
                    });
                })
                .catch((error) => {
                    console.error(error);
                    setState((prev) => ({ ...prev, isFetching: false, error: error.message }));
                });
        } else {
            setState((prev) => ({
                ...prev,
                balance: null,
                firstActivityTime: null,
                lastActivityTime: null,
                tokens: null,
                domain: null,
                operations: null,
            }));
        }
    }, [state.searchText, state.network]);

    return (
        <>
            <List
                isShowingDetail
                isLoading={state.isFetching}
                searchText={state.searchText}
                searchBarAccessory={
                    <List.Dropdown
                        tooltip="Select the desired network"
                        value={state.network}
                        onChange={(newValue) => setState((previous) => ({ ...previous, network: newValue as Network }))}
                    >
                        <List.Dropdown.Item title="Mainnet" value={Network.Mainnet} />
                        <List.Dropdown.Item title="Ghostnet" value={Network.Ghostnet} />
                    </List.Dropdown>
                }
                onSearchTextChange={(searchText) =>
                    setState((previous) => ({
                        ...previous,
                        searchText: searchText,
                        balance: null,
                        firstActivityTime: null,
                        lastActivityTime: null,
                        tokens: null,
                        domain: null,
                        operations: null,
                        error: null,
                    }))
                }
            >
                {state.searchText === "" ? (
                    <EmptyView network={state.network} />
                ) : state.error ? (
                    <List.Section title="Error">
                        <List.Item id="error" title={`Error: ${state.error}`} />
                    </List.Section>
                ) : (
                    <>
                        {state.isFetching ? (
                            <List.Section title="Fetching">
                                <List.Item id="fetching" title="Loading..." />
                            </List.Section>
                        ) : (
                            <>
                                <List.Section title="Navigate the sections below">
                                    <List.Item
                                        id="accountDetails"
                                        title="User Information   ->"
                                        detail={
                                            <List.Item.Detail
                                                metadata={
                                                    <List.Item.Detail.Metadata>
                                                        <List.Item.Detail.Metadata.Label title="Account Balance:" text={`${state.balance} XTZ`} />
                                                        <List.Item.Detail.Metadata.Label
                                                            title="First Activity:"
                                                            text={state.firstActivityTime || "N/A"}
                                                        />
                                                        <List.Item.Detail.Metadata.Label
                                                            title="Last Active:"
                                                            text={state.lastActivityTime || "N/A"}
                                                        />
                                                        <List.Item.Detail.Metadata.Label
                                                            title="Tezos Domain:"
                                                            text={state.domain || "No domain found"}
                                                        />
                                                        <List.Item.Detail.Metadata.Label title="Recent Transactions" />
                                                        {state.operations?.map((op, index) => (
                                                            <List.Item.Detail.Metadata.Label
                                                                key={`op-${index}`}
                                                                title={op.target.alias ?? op.target.address ?? "No alias or address"}
                                                                text={`${op.timestamp} `}
                                                            />
                                                        ))}
                                                    </List.Item.Detail.Metadata>
                                                }
                                            />
                                        }
                                    />
                                </List.Section>
                                <List.Section title={`Total User NFT's : ${state.tokens?.length || 0}`}>
                                    {state.tokens?.map((token: unknown, index: number) => {
                                        const flattenedToken: FlattenedTokenData = token as FlattenedTokenData;
                                        const processedDisplayUri = `https://display-thumbs.dipdup.net/${flattenedToken[
                                            "token.metadata.displayUri"
                                        ].slice(7)}`;

                                        return flattenedToken["token.metadata.name"] ? (
                                            <List.Item
                                                key={index}
                                                id={`token-${index}`}
                                                title={flattenedToken["token.metadata.name"] || "N/A"}
                                                subtitle={`ID: ` + flattenedToken["token.tokenId"]}
                                                detail={
                                                    <List.Item.Detail
                                                        markdown={`![${flattenedToken["token.metadata.name"]}](${processedDisplayUri})`}
                                                        metadata={
                                                            <List.Item.Detail.Metadata>
                                                                <List.Item.Detail.Metadata.Label
                                                                    title="Name:"
                                                                    text={flattenedToken["token.metadata.name"]}
                                                                />
                                                                <List.Item.Detail.Metadata.Label
                                                                    title="Token ID:"
                                                                    text={"#" + flattenedToken["token.tokenId"]}
                                                                />
                                                                <List.Item.Detail.Metadata.Label title="Balance:" text={flattenedToken.balance} />
                                                            </List.Item.Detail.Metadata>
                                                        }
                                                    />
                                                }
                                            />
                                        ) : null;
                                    })}
                                </List.Section>
                            </>
                        )}
                    </>
                )}
            </List>
        </>
    );
}

