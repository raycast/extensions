import { Detail } from "@raycast/api";
import { bridgeNotFoundMessage } from "../lib/markdown";

export default function BridgeNotFound() {
  return <Detail key="hueBridgeNotFound" markdown={bridgeNotFoundMessage} />;
}
