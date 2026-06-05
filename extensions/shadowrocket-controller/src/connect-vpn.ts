import { connectVpn } from "./lib/shadowrocket";

export default async function Command() {
  await connectVpn();
}
