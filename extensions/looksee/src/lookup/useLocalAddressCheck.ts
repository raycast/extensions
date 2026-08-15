import { Dispatch, SetStateAction, useEffect, useState } from "react";

/**
 * Checks if a given MAC address is local
 *
 * @see https://www.rfc-editor.org/rfc/rfc9542#name-48-bit-mac-identifiers-ouis
 * @param address the MAC address to check
 * @return true if local, false if not
 */
export const useLocalAddressCheck = (address: string): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const [isLocalAddress, setIsLocalAddress] = useState(false);

  useEffect(() => {
    setIsLocalAddress(isMACAddressLocal(address));
  }, [setIsLocalAddress, address]);

  return [isLocalAddress, setIsLocalAddress];
};

const MAC_ADDRESS_LENGTH = 12;

const isMACAddressLocal = (address: string): boolean => {
  const addressWithoutDelimiters = address.replace(/[^A-Za-z0-9]/g, "").toLowerCase();

  if (addressWithoutDelimiters.length !== MAC_ADDRESS_LENGTH) {
    return false;
  }

  const secondHex = addressWithoutDelimiters[1];
  if (secondHex) {
    return /[26ae]/.test(secondHex);
  }

  return false;
};
