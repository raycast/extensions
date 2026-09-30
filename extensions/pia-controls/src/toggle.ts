import { toggleVpn } from "./lib/actions";

export default async function Command() {
  await toggleVpn();
}
