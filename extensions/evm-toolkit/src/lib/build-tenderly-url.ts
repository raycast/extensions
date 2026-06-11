interface TenderlyParams {
  chainId: number;
  to: string;
  calldata: string;
  from?: string;
  value?: string;
}

export function buildTenderlyUrl(params: TenderlyParams): string {
  const url = new URL("https://dashboard.tenderly.co/simulator/new");
  url.searchParams.set("contractAddress", params.to);
  url.searchParams.set("rawFunctionInput", params.calldata);
  url.searchParams.set("network", String(params.chainId));
  if (params.from) url.searchParams.set("from", params.from);
  if (params.value) url.searchParams.set("value", params.value);
  return url.toString();
}
