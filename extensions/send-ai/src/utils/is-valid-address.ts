import { PublicKey } from "@solana/web3.js";

export const isValidSolanaAddress = (address: string) => {
  try {
    const key = new PublicKey(address);
    return PublicKey.isOnCurve(key.toBytes());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
};
