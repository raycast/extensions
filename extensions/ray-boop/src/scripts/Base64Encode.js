/**
	{
		"api":1,
		"name":"Base64 Encode",
		"description":"Encodes your text to Base64",
		"author":"See Source",
		"icon":"metamorphose",
		"tags":"base64,atob,encode"
	}
**/

import { encode } from "js-base64";

export function main(input) {
  input.text = encode(input.text);
}
