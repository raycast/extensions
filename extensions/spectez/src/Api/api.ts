import fetch from "node-fetch";
import {
  AccountData,
  ContractData,
  DomainData,
  Entrypoint,
  Network,
  OperationData,
  TokenData,
} from "../Types/types";

async function fetchAccountData(account: string, apiUrl: string) {
  const response = await fetch(`https://${apiUrl}/v1/accounts/${account}`);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  const data = (await response.json()) as AccountData;
  const balanceInXTZ = parseInt(data.balance) / 1000000; // Convert mutez to XTZ
  return {
    balance: balanceInXTZ.toString(),
    lastActivityTime: data.lastActivityTime,
    firstActivityTime: data.firstActivityTime,
  };
}

async function fetchTokenData(account: string, apiUrl: string) {
  const tokenResponse = await fetch(
    `https://${apiUrl}/v1/tokens/balances?` +
      new URLSearchParams({
        account: account,
        "token.standard": "fa2",
        "balance.gt": "0",
        "token.metadata.artifactUri.null": "false",
        limit: "10000",
        "token.metadata.decimals": "0",
        "sort.desc": "lastLevel",
        select: [
          "balance",
          "token.contract.address",
          "token.tokenId",
          "token.metadata.name",
          "token.metadata.symbol",
          "token.metadata.decimals",
          "token.metadata.displayUri",
          "token.metadata.artifactUri",
          "token.metadata.thumbnailUri",
        ].join(","),
      }),
  );
  if (!tokenResponse.ok) {
    throw new Error(
      `Token API request failed with status ${tokenResponse.status}`,
    );
  }
  const tokens = (await tokenResponse.json()) as TokenData[];
  return tokens;
}

async function fetchDomainData(account: string, apiUrl: string) {
  const domainResponse = await fetch(
    `https://${apiUrl}/v1/domains?owner=${account}`,
  );
  if (!domainResponse.ok) {
    throw new Error(
      `Domain API request failed with status ${domainResponse.status}`,
    );
  }
  const domains = (await domainResponse.json()) as DomainData[];
  const domain = domains.length > 0 ? domains[0].name : null; // Using the first domain name
  return domain;
}

async function fetchAccountOperations(account: string, apiUrl: string) {
  const operationsResponse = await fetch(
    `https://${apiUrl}/v1/accounts/${account}/operations?` +
      new URLSearchParams({
        limit: "15",
      }),
  );

  if (!operationsResponse.ok) {
    throw new Error(
      `Operations API request failed with status ${operationsResponse.status}`,
    );
  }

  const operations = (await operationsResponse.json()) as OperationData[];
  // Extract only timestamp and sender's alias from each operation
  const simplifiedOperations = operations.map((op) => ({
    timestamp: op.timestamp,
    targetAlias: op.target.alias,
    targetAddress: op.target.address,
  }));
  return simplifiedOperations;
}

async function fetchContractData(account: string, apiUrl: string) {
  const contractResponse = await fetch(
    `https://${apiUrl}/v1/contracts/${account}`,
  );
  if (!contractResponse.ok) {
    throw new Error(
      `Contract API request failed with status ${contractResponse.status}`,
    );
  }
  const data = (await contractResponse.json()) as ContractData;

  // Fetching entrypoints
  const entrypointsResponse = await fetch(
    `https://${apiUrl}/v1/contracts/${account}/entrypoints`,
  );
  if (!entrypointsResponse.ok) {
    throw new Error(
      `Entrypoints API request failed with status ${entrypointsResponse.status}`,
    );
  }

  const entrypointsData = (await entrypointsResponse.json()) as Entrypoint[];
  const entrypoints = entrypointsData.map((ep) => ep.name);

  return {
    contractAddress: data.address,
    creatorAddress: data.creator.address,
    tokensCount: data.tokensCount,
    tokenBalancesCount: data.tokenBalancesCount,
    firstActivityTime: data.firstActivityTime,
    lastActivityTime: data.lastActivityTime,
    entrypoints,
  };
}

export async function fetchBalanceAndTokens(
  account: string,
  network: Network,
): Promise<{
  balance: string | null;
  lastActivityTime: string | null;
  firstActivityTime: string | null;
  tokens: TokenData[] | null;
  domain: string | null;
  operations: {
    timestamp: string;
    targetAlias: string;
    targetAddress: string;
  }[] | null;
}> {
  const apiUrl = network === Network.Ghostnet
    ? "api.ghostnet.tzkt.io"
    : "api.tzkt.io";
  try {
    const { balance, lastActivityTime, firstActivityTime } =
      await fetchAccountData(account, apiUrl);
    const tokens = await fetchTokenData(account, apiUrl);
    const domain = await fetchDomainData(account, apiUrl);
    const operations = await fetchAccountOperations(account, apiUrl);

    return {
      balance,
      lastActivityTime,
      firstActivityTime,
      tokens,
      domain,
      operations,
    };
  } catch (error) {
    console.error(error);
    return {
      balance: null,
      lastActivityTime: null,
      firstActivityTime: null,
      tokens: null,
      domain: null,
      operations: null,
    };
  }
}

export async function fetchContractDataDetails(
  account: string,
  network: Network,
): Promise<{
  contract: {
    contractAddress: string;
    creatorAddress: string;
    tokensCount: number;
    tokenBalancesCount: number;
    firstActivityTime: string;
    lastActivityTime: string;
    entrypoints: string[];
  } | null;
}> {
  const apiUrl = network === Network.Ghostnet
    ? "api.ghostnet.tzkt.io"
    : "api.tzkt.io";
  try {
    const contract = await fetchContractData(account, apiUrl);

    return {
      contract,
    };
  } catch (error) {
    console.error(error);
    return {
      contract: null,
    };
  }
}
