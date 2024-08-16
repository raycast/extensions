import { useEffect, useState, useMemo } from "react";
import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { chainData } from "./data";
import { parser } from "./parser";
import { ParsedToken, ChainData, TokenType } from "./types";
import utils from "./utils";
import ListItem from "./components/ListItem";
import rpc from "./rpc";

export default function Command() {
  const [tokenData, setTokenData] = useState<ParsedToken>({ networks: chainData });
  const [results, setResults] = useState<JSX.Element[]>();
  // useEffect(() => {
  //   parseSearchText("");
  // }, []);

  const parseSearchText = (searchText: string) => {
    const data = parser(searchText);
    setTokenData(data);
  }

  useMemo(() => {
    let result: JSX.Element[] = [];
    let rpcData: any = [];
    result = tokenData.networks.map((chain) => {
      switch (tokenData.type) {
        case TokenType.Address:
          rpcData.push(rpc.getBalance(chain.rpcUrls[0], tokenData.token!));
          break;
        case TokenType.Tx:
          rpcData.push(rpc.getTransactionReceipt(chain.rpcUrls[0], tokenData.token!));
          break;
        case TokenType.BlockNumber:
          rpcData.push(rpc.getBlockByNumber(chain.rpcUrls[0], tokenData.token!));
          break;
        case TokenType.BlockHash:
          rpcData.push(rpc.getBlockByHash(chain.rpcUrls[0], tokenData.token!));
          break;
        default:
          rpcData.push(rpc.getBlockNumber(chain.rpcUrls[0]));
      }
      return ListItem({ type: tokenData.type, token: tokenData.token, chain });
    });
    Promise.allSettled(rpcData).then((results) => {
      results.map((result) => {
        result.status
      })
    });

    setResults(result);

  }, [tokenData])


  return (
    <List
      filtering={false}
      searchBarPlaceholder="Search on chains..."
      onSearchTextChange={parseSearchText}
      isLoading={chainData.length === 0}
      navigationTitle="Chains"
      isShowingDetail
    >
      {results}
    </List>
  );
}
