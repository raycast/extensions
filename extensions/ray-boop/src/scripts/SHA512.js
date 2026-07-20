/**
    {
        "api":1,
        "name":"SHA512 Hash",
        "description":"Computes the SHA512 hash of your text (Hex encoded)",
        "icon":"fingerprint",
        "tags":"strip,slashes,remove"
    }
**/

import { createHash } from "crypto";

export function main(state) {
  state.text = createHash("sha512").update(state.text).digest("hex");
}
