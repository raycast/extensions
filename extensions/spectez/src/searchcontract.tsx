import { useEffect, useState } from "react";
import { Network, ContractData } from "./Types/types";
import { List } from "@raycast/api";
import EmptyView from "./Components/UserAccountEmptyview";
import { fetchContractDataDetails } from "./Api/api";

type State = {
  network: Network;
  isFetching: boolean;
  searchText: string;
  contract: ContractData | null;
  error: string | null;
};

export default function SearchAccount() {
  const [state, setState] = useState<State>({
    network: Network.Mainnet,
    isFetching: false,
    searchText: "",
    contract: null,
    error: null,
  });

  useEffect(() => {
    if (state.searchText !== "") {
      setState((prev) => ({ ...prev, isFetching: true }));
      fetchContractDataDetails(state.searchText, state.network)
        .then((data) => {
          if (data.contract !== null) {
            const firstActivity = data.contract.firstActivityTime
              ? new Date(data.contract.firstActivityTime).toLocaleString()
              : "N/A";
            const lastActivity = data.contract.lastActivityTime
              ? new Date(data.contract.lastActivityTime).toLocaleString()
              : "N/A";

            setState({
              ...state,
              contract: {
                address: data.contract.contractAddress,
                creator: { address: data.contract.creatorAddress },
                tokensCount: data.contract.tokensCount,
                tokenBalancesCount: data.contract.tokenBalancesCount,
                firstActivityTime: firstActivity,
                lastActivityTime: lastActivity,
                entrypoints: data.contract.entrypoints,
              },
              isFetching: false,
            });
          }
        })
        .catch((error) => {
          console.error(error);
          setState((prev) => ({ ...prev, isFetching: false, error: error.message }));
        });
    } else {
      setState((prev) => ({
        ...prev,
        contract: null,
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
            onChange={(newValue) =>
              setState((previous) => ({
                ...previous,
                network: newValue as Network,
              }))
            }
          >
            <List.Dropdown.Item title="Mainnet" value={Network.Mainnet} />
            <List.Dropdown.Item title="Ghostnet" value={Network.Ghostnet} />
          </List.Dropdown>
        }
        onSearchTextChange={(searchText) =>
          setState((previous) => ({
            ...previous,
            searchText: searchText,
            contract: null,
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
                {state.contract && (
                  <List.Section title="Navigate the sections below">
                    <List.Item
                      id="contractDetails"
                      title={"Contract Information   ->"}
                      detail={
                        <List.Item.Detail
                          metadata={
                            <List.Item.Detail.Metadata>
                              <List.Item.Detail.Metadata.Label title="Contract Address:" text={state.contract.address} />
                              <List.Item.Detail.Metadata.Label title="Creator Address:" text={state.contract.creator.address} />
                              <List.Item.Detail.Metadata.Label title="Total minted tokens:" text={`${state.contract.tokensCount}`} />
                              <List.Item.Detail.Metadata.Label title="Token Balances Count:" text={`${state.contract.tokenBalancesCount}`} />
                              <List.Item.Detail.Metadata.Label title="First Activity:" text={state.contract.firstActivityTime || "N/A"} />
                              <List.Item.Detail.Metadata.Label title="Last Active:" text={state.contract.lastActivityTime || "N/A"} />
                            </List.Item.Detail.Metadata>
                          }
                        />
                      }
                    />
                    <List.Item
                      id="entrypointsDetails"
                      title={`Total Entrypoints: ${state.contract.entrypoints.length}   ->`}
                      detail={
                        <List.Item.Detail
                          metadata={
                            <List.Item.Detail.Metadata>
                              {state.contract.entrypoints.map((entrypoint, index) => (
                                <List.Item.Detail.Metadata.Label key={index} title={`Entrypoint ${index + 1}:`} text={entrypoint} />
                              ))}
                            </List.Item.Detail.Metadata>
                          }
                        />
                      }
                    />
                  </List.Section>
                )}
              </>
            )}
          </>
        )}
      </List>
    </>
  );
}
