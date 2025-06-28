/**
    {
        "api":1,
        "name":"SHA256 Hash",
        "description":"Computes the SHA256 hash of your text (Hex encoded)",
        "icon":"fingerprint",
        "tags":"strip,slashes,remove"
    }
**/

import CryptoJS from "crypto-js";

export function main(state) {
  state.text = CryptoJS.SHA256(state.text).toString();
}
