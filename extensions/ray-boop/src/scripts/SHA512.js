/**
    {
        "api":1,
        "name":"SHA512 Hash",
        "description":"Computes the SHA512 hash of your text (Hex encoded)",
        "icon":"fingerprint",
        "tags":"strip,slashes,remove"
    }
**/

import CryptoJS from "crypto-js";

export function main(state) {
  state.text = CryptoJS.SHA512(state.text).toString();
}
