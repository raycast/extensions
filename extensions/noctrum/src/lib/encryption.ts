import { encrypt } from "eciesjs";
import { CRE_PUBKEY } from "./constants";

export function encryptRate(rate: string): string {
  const buf = encrypt(CRE_PUBKEY, Buffer.from(rate));
  return "0x" + Buffer.from(buf).toString("hex");
}
