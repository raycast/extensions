import { showHUD, Clipboard } from "@raycast/api";
import { AddressType } from "./lib/get-address";

export default async function main() {
  const addressType = AddressType.IPV4;
  const addressResponse = await addressType.getAddress();
  if (addressResponse.v4) {
    await Clipboard.copy(addressResponse.v4);
    await showHUD("Your public IPv4 address is " + addressResponse.v4);
  } else {
    await showHUD("Could not find IPv4 address.");
  }
}
