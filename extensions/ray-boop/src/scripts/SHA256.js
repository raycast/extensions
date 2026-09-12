/**
    {
        "api":1,
        "name":"SHA256 Hash",
        "description":"Computes the SHA256 hash of your text (Hex encoded)",
        "icon":"fingerprint",
        "tags":"strip,slashes,remove"
    }
**/

import { createHash } from "crypto";

export function main(state) {
  state.text = createHash("sha256").update(state.text).digest("hex");
}
