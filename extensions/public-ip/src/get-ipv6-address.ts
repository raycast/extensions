import { showHUD, Clipboard } from "@raycast/api";
import { AddressType } from "./lib/get-address";

export default async function main() {
  const addressType = AddressType.IPV6;
  const addressResponse = await addressType.getAddress();
  if (addressResponse.v6) {
    await Clipboard.copy(addressResponse.v6);
    await showHUD("Your public IPv6 address is " + addressResponse.v6);
  } else {
    await showHUD("Could not find IPv6 address.");
  }
}
