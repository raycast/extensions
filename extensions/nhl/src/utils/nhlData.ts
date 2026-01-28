import { useFetch } from "@raycast/utils";

export function getNHL(route: string) {
  const trimmedRoute = route.startsWith("/") ? route.slice(1) : route;
  return useFetch(`https://api-web.nhle.com/v1/${trimmedRoute}`);
}
