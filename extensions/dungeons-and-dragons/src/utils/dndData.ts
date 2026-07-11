import { useFetch } from "@raycast/utils";

export function getDnd(route: string) {
  const { isLoading, data, revalidate } = useFetch(`https://www.dnd5eapi.co${route}`);
  return { isLoading, data, revalidate };
}

export function verifyChallengeLevel(str: string): boolean {
  return /^-?(?:\d{1,2}(\.\d{1,30})?|\.\d{1,30})$/.test(str);
}
