import { Icon } from "@raycast/api";

/**
 * Returns the icon corresponding to a given transport type.
 */
export function getTransportIcon(transport: string) {
  switch (transport) {
    case "stdio":
      return Icon.Terminal;
    case "sse":
    case "/sse":
      return Icon.Globe;
    case "http":
      return Icon.Network;
    default:
      return Icon.Gear;
  }
}
