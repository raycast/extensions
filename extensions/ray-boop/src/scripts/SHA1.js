/**
    {
        "api":1,
        "name":"SHA1 Hash",
        "description":"Computes the SHA1 hash of your text (Hex encoded)",
        "icon":"fingerprint",
        "tags":"strip,slashes,remove"
    }
**/

import CryptoJS from "crypto-js";

export function main(state) {
  state.text = CryptoJS.SHA1(state.text).toString();
}
