import { Icon } from "@raycast/api";
import { useFeedbinApiContext } from "./FeedbinApiContext";
import { getHost } from "./getHost";

export function useIcon(url: string) {
  const { iconMap } = useFeedbinApiContext();
  const host = getHost(url);
  return (host && iconMap[host]) || Icon.Globe;
}
