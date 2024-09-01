import { Icon } from "@raycast/api";

export function getIdHex(id: string) {
  return Buffer.from(id).toString("hex");
}

export function getIconById(id: string) {
  return {
    source: `https://favicons.nextdns.io/hex:${getIdHex(id)}@2x.png`,
    fallback: Icon.Globe,
  };
}
