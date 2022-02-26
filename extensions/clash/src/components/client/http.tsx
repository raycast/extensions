import { ProxiesT, RuleT } from "../types";
import { fetchBackend } from "../../utils";

async function GetProviders(): Promise<ProxiesT> {
  const resp = await fetchBackend("/proxies");
  type DataT = { proxies: ProxiesT };
  const data = (await resp.json()) as DataT;
  return data.proxies;
}

async function GetRules(): Promise<Array<RuleT>> {
  const resp = await fetchBackend("/rules");
  type DataT = { rules: Array<RuleT> };
  const data = (await resp.json()) as DataT;
  return data.rules;
}

export { GetProviders, GetRules };
