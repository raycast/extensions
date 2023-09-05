import { randomBytes } from "crypto";

export function getRandomString(length = 16) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}
