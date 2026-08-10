import axios from "axios";
import { Chain, ChainId, ComplexProtocol, Token } from "@yukaii/debank-types";

const api = axios.create({
  baseURL: "https://openapi.debank.com/",
});

api.interceptors.response.use((response) => {
  return response.data;
});

export type TotalBalance = {
  total_usd_value: number;
  chain_list: (Chain & { usd_value: number })[];
};

export function getTotalBalance(id: string): Promise<TotalBalance> {
  return api.get("/v1/user/total_balance", {
    params: {
      id,
    },
  });
}

export function getComplexProtocolList(id: string, chain_id: ChainId): Promise<ComplexProtocol[]> {
  return api.get("/v1/user/complex_protocol_list", {
    params: {
      id,
      chain_id,
    },
  });
}

export function getTokenList(id: string, chain_id: ChainId, is_all = false): Promise<Token[]> {
  return api.get("/v1/user/token_list", {
    params: {
      id,
      chain_id,
      is_all,
    },
  });
}
