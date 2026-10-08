import { environment } from "@raycast/api";
import { ProviderVersion } from "./provider-version";
import { Resource } from "./resource";
import { useCachedState } from "@raycast/utils";
import { Provider } from "./provider";

const HISTORY_SIZE = 100;

type ResourceHistory = {
  provider: Provider;
  version: ProviderVersion;
  resource: Resource;
};

export function useResourceHistoriesState(): [
  ResourceHistory[],
  React.Dispatch<React.SetStateAction<ResourceHistory[]>>,
] {
  const [resHistories, setResHistories] = useCachedState<
    {
      provider: Provider;
      version: ProviderVersion;
      resource: Resource;
    }[]
  >(`recentry accessed resources`, [], {
    cacheNamespace: `${environment.extensionName}`,
  });
  return [resHistories, setResHistories];
}

export function updateHistories(
  input: ResourceHistory,
  res: ResourceHistory[],
  setState: React.Dispatch<React.SetStateAction<ResourceHistory[]>>,
) {
  const dupIndex = res.findIndex(
    (r) =>
      `${r.provider.id}/${r.version.id}/${r.resource.id}` ===
      `${input.provider.id}/${input.version.id}/${input.resource.id}`,
  );
  if (dupIndex > -1) res.splice(dupIndex, 1);
  res.unshift(input);
  res = res.slice(0, HISTORY_SIZE);
  setState(res);
}
