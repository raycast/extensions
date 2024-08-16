import { RPCResponse, Balance, TxReciept, BlockDetails } from "./types";

export const getBalance = async (rpc: string, address: string) => {
  const response = await fetch(rpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"]
    })
  });
  const data = (await response.json()) as RPCResponse<Balance>;
  return BigInt(data.result).toLocaleString();
}

export const getTransactionReceipt = async (rpc: string, txHash: string) => {
  const response = await fetch(rpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash]
    })
  });
  const data = (await response.json()) as RPCResponse<TxReciept>;
  return data.result;
}

export const getBlockByNumber = async (rpc: string, blockNumber: string) => {
  const response = await fetch(rpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBlockByNumber",
      params: [blockNumber, true]
    })
  });
  const data = (await response.json()) as RPCResponse<BlockDetails>;
  return data.result;
}

export const getBlockByHash = async (rpc: string, blockHash: string) => {
  const response = await fetch(rpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBlockByHash",
      params: [blockHash, true]
    })
  });
  const data = (await response.json()) as RPCResponse<BlockDetails>;
  return data.result;
}

export const getBlockNumber = async (rpc: string) => {
  const response = await fetch(rpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_blockNumber",
      params: []
    })
  });
  const data = (await response.json()) as RPCResponse<string>;
  return data.result;
}

export default {
  getBalance,
  getTransactionReceipt,
  getBlockByNumber,
  getBlockByHash,
  getBlockNumber
}