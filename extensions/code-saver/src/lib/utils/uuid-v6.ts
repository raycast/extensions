import * as crypto from "crypto";
import { v1 } from "uuid";

export const uuidv6 = (opts?: { disableRandom: boolean }): string => {
  const disableRandom = opts ? opts.disableRandom : false;
  const raw = v1();

  const prefix = `${raw.substring(15, 18)}${raw.substring(9, 13)}${raw.substring(0, 5)}6${raw.substring(5, 8)}`;
  const prefixFormatted = `${prefix.slice(0, 8)}-${prefix.slice(8, 12)}-${prefix.slice(12)}`;

  if (disableRandom) {
    return `${prefixFormatted}${raw.slice(18)}`;
  }

  const random = crypto.randomBytes(8).toString("hex");

  return `${prefixFormatted}-${random.substring(0, 4)}-${random.substring(4)}`;
};
