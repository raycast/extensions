import { disconnectVpn } from "./lib/actions";

export default async function Command() {
  await disconnectVpn();
}
