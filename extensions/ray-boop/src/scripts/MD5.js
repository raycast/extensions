/**
	{
		"api":1,
		"name":"MD5 Checksum",
		"description":"Computes the checksum of your text (Hex encoded).",
		"author":"Ivan",
		"icon":"fingerprint",
		"tags":"strip,slashes,remove"
	}
**/

import CryptoJS from "crypto-js";

export function main(state) {
  state.text = CryptoJS.MD5(state.text).toString();
}
