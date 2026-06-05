import { disconnectVpn } from "./lib/shadowrocket";

export default async function Command() {
  await disconnectVpn();
}
