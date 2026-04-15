import { createHash } from "crypto";
import { pwnedPasswordsFetch } from "./api";

export async function checkPassword(password: string): Promise<number> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const body = await pwnedPasswordsFetch(prefix);

  for (const line of body.split("\r\n")) {
    const [lineSuffix, countStr] = line.split(":");
    if (lineSuffix === suffix) {
      return parseInt(countStr, 10);
    }
  }

  return 0;
}

export function hashPassword(password: string): string {
  return createHash("sha1").update(password).digest("hex").toUpperCase();
}
