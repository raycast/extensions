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

import { createHash } from "crypto";

export function main(state) {
  state.text = createHash("md5").update(state.text).digest("hex");
}
