import { createHash } from "crypto";

export function createMD5HashFromStrings(...strings: string[]) {
  const hash = createHash("md5");

  strings.forEach((str) => {
    hash.update(str);
  });

  return hash.digest("hex");
}
