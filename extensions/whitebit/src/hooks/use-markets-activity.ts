import { useCachedState } from "@raycast/utils";
import { MarketsActivityResponse, MarketsRequester } from "../api/markets";
import { useHttpClient } from "./use-http-client";

export function useMarketsActivity() {
  const client = useHttpClient();
  const marketsActivityRequester = new MarketsRequester(client);
  const [state, setState] = useCachedState<MarketsActivityResponse>("markets_activity", {});

  async function updateActivity() {
    const result = await marketsActivityRequester.activity();

    setState(result);
  }

  return {
    state,
    setState,
    updateActivity,
  };
}
