import { showHUD, Clipboard } from "@raycast/api";
import { AddressType } from "./lib/get-address";

export default async function main() {
  const addressType = AddressType.BOTH;
  const addressResponse = await addressType.getAddress();

  let response: string | null = null;
  const clipboardContent = [];

  if (addressResponse.v4) {
    clipboardContent.push(addressResponse.v4);
    response = "Your public IPv4 address is " + addressResponse.v4;
  }

  if (addressResponse.v6) {
    clipboardContent.push(addressResponse.v6);
    if (response == null) {
      response = "Your IPv6 address is " + addressResponse.v6;
    } else {
      response += ", and your IPv6 address is " + addressResponse.v6;
    }
  }

  await Clipboard.copy(clipboardContent.join("\n"));

  if (response == null) {
    await showHUD("Failed to find either IP address.");
  } else {
    await showHUD(response);
  }
}
