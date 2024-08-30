import { DomainListItem } from "../types";

export function getIdHex(element: DomainListItem) {
  return Buffer.from(element.id).toString("hex");
}

export function getIcon(element: DomainListItem) {
  return `https://favicons.nextdns.io/hex:${getIdHex(element)}@2x.png`;
}
