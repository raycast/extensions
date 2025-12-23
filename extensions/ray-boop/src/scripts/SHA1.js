/**
    {
        "api":1,
        "name":"SHA1 Hash",
        "description":"Computes the SHA1 hash of your text (Hex encoded)",
        "icon":"fingerprint",
        "tags":"strip,slashes,remove"
    }
**/

import { createHash } from "crypto";

export function main(state) {
  state.text = createHash("sha1").update(state.text).digest("hex");
}
