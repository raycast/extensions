import { Transformation } from "./types";
import { createHash } from "crypto";

export const sha512: Transformation = {
  id: "sha512",
  name: "SHA512 Hash",
  description: "Generate SHA512 hash",
  icon: "fingerprint",
  transform: (text) => createHash("sha512").update(text).digest("hex"),
  preferenceKey: "enableSha512",
};
