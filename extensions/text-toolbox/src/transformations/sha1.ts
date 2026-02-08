import { Transformation } from "./types";
import { createHash } from "crypto";

export const sha1: Transformation = {
  id: "sha1",
  name: "SHA1 Hash",
  description: "Generate SHA1 hash",
  icon: "fingerprint",
  transform: (text) => createHash("sha1").update(text).digest("hex"),
  preferenceKey: "enableSha1",
};
