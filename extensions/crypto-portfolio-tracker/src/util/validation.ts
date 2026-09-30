import { isAddress } from "viem";

export const isValidEthereumAddress = (address: string): boolean => isAddress(address);
