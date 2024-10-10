import { useFetch } from "@raycast/utils";
import { Database, Vector } from "../types/types";
import { getPreferenceValues } from "@raycast/api";

export function useData() {
  const { email, apiKey } = getPreferenceValues<ExtensionPreferences>();


  const options = {
    headers: {
      Authorization:
        "Basic " + btoa(`${email}:${apiKey}`)
    }
  };

  const { data: redis = [], isLoading: isLoadingRedis } = useFetch<Database[]>(
    "https://api.upstash.com/v2/redis/databases",
    options
  );

  const { data: vector = [], isLoading: isLoadingVector } = useFetch<Vector[]>(
    "https://api.upstash.com/v2/vector/index",
    options
  );

  return { redis, vector, isLoading: isLoadingRedis && isLoadingVector };
}