import { Transformation } from "./types";
import { createHash } from "crypto";

export const sha256: Transformation = {
  id: "sha256",
  name: "SHA256 Hash",
  description: "Generate SHA256 hash",
  icon: "fingerprint",
  transform: (text) => createHash("sha256").update(text).digest("hex"),
  preferenceKey: "enableSha256",
};
