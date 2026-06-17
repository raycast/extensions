import { AssetRequester, AssetResponse } from "../api/assets";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { HttpClient } from "../api/httpClient";

export function useAssets(client: HttpClient) {
  const assetsRequester = new AssetRequester(client);
  const [assets, setAssets] = useCachedState<AssetResponse>("assets", {});

  useEffect(() => {
    if (Object.keys(assets).length === 0) {
      assetsRequester.deposit().then((result) => setAssets(result));
    }
  }, []);

  return {
    assets,
    setAssets,
  };
}
