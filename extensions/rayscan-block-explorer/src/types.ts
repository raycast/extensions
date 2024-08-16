export type ChainData = {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    icon: string;
    decimals: number;
  };
  blockExplorerName: string;
  blockExplorerUrl: string;
  icon: string;
  rpcUrls: string[];
  keywords: string[];
  priority: number;
};

export type ParsedToken = {
  type?: TokenType
  token?: string;
  networks: ChainData[];
}

export enum TokenType {
  Address = "add",
  Tx = "tx",
  BlockNumber = "block",
  BlockHash = "block"
}

export type TxReciept = {
  blockHash: string;
  blockNumber: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  from: string;
  gasUsed: string;
  logs: any[];
  logsBloom: string;
  status: string;
  to: string;
  transactionHash: string;
  transactionIndex: string;
}

export type Balance = string;

export type BlockDetails = {
  number: string;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  transactions: string[];
  uncles: string[];
}

export type RPCResponse<T> = {
  jsonrpc: string;
  id: number;
  result: T;
}