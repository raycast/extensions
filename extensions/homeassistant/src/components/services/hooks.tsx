import { useCachedPromise } from "@raycast/utils";
import { getHomeAssistantServices, HAServiceMeta } from "./utils";

export interface HAServiceCall {
  domain: string;
  service: string;
  name: string;
  description: string;
  meta: HAServiceMeta;
}

export function useServiceCalls() {
  const { data, error, isLoading } = useCachedPromise(async () => {
    const result: HAServiceCall[] = [];
    const services = await getHomeAssistantServices();
    if (services) {
      for (const s of services) {
        if (s.services) {
          for (const [service, meta] of Object.entries(s.services)) {
            result.push({ domain: s.domain, service, name: meta.name, description: meta.name, meta: meta });
          }
        }
      }
    }
    return result;
  });
  return { data, error, isLoading };
}
