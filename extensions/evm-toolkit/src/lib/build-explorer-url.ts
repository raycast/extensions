import { type InputType, ROUTE_TEMPLATES } from "./explorer-types";
import type { Network } from "./networks";

export function buildExplorerUrl(
  network: Network,
  inputType: InputType,
  value: string,
): string {
  const template = ROUTE_TEMPLATES[network.explorerType][inputType];
  const path = template.replace("{value}", value);
  return `${network.explorerUrl}${path}`;
}
