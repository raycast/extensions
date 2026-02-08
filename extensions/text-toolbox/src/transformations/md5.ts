import { Transformation } from "./types";
import { createHash } from "crypto";

export const md5: Transformation = {
  id: "md5",
  name: "MD5 Hash",
  description: "Generate MD5 hash",
  icon: "fingerprint",
  transform: (text) => createHash("md5").update(text).digest("hex"),
  preferenceKey: "enableMd5",
};
