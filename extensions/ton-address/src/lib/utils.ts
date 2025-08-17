import TonWeb from "tonweb";
import { Address } from "tonweb/dist/types/utils/address";

export function isTestnet(address: string): boolean {
  return address.startsWith("kQ") || address.startsWith("0Q");
}

export function isValidTonAddressOrDomain(address: string): boolean {
  if (/^.{4,}\.ton$/i.test(address)) {
    return true;
  }

  try {
    new TonWeb.utils.Address(address);
    return true;
  } catch (error) {
    return false;
  }
}

export type AddressFormat = {
  title: string;
  value: string;
};

export function getFormattedAddresses(addressObj: Address): AddressFormat[] {
  return [
    // Parameters: isUserFriendly, isUrlSafe, isBounceable, isTestOnly
    { title: "Raw Address", value: addressObj.toString(false, true, false) },
    { title: "Mainnet Bounceable", value: addressObj.toString(true, true, true) },
    { title: "Mainnet Non-bounceable", value: addressObj.toString(true, true, false) },
    { title: "Testnet Bounceable", value: addressObj.toString(true, true, true, true) },
    { title: "Testnet Non-bounceable", value: addressObj.toString(true, true, false, true) },
  ];
}
