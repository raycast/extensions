import { fetchBackend } from "../../utils";
import { ProxiesT, RuleT } from "../types";

async function GetProviders(): Promise<ProxiesT> {
  const resp = await fetchBackend({ endpoint: "/proxies" });
  type DataT = { proxies: ProxiesT };
  const data = (await resp.json()) as DataT;
  return data.proxies;
}

async function GetRules(): Promise<Array<RuleT>> {
  const resp = await fetchBackend({ endpoint: "/rules" });
  type DataT = { rules: Array<RuleT> };
  const data = (await resp.json()) as DataT;
  return data.rules;
}

async function SelectProxy(name: string, proxy: string): Promise<void> {
  const resp = await fetchBackend({
    endpoint: `/proxies/${name}`,
    method: "PUT",
    body: { name: proxy },
  });

  if (resp.status === 400) {
    throw new Error("Format error");
  }
  if (resp.status === 404) {
    throw new Error("Proxy not found");
  }
  if (resp.status !== 204) {
    throw new Error(`Unexpected status code: ${resp.status}`);
  }
}

export { GetProviders, GetRules, SelectProxy };
