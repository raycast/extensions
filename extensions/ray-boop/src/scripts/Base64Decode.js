/**
	{
		"api":1,
		"name":"Base64 Decode",
		"description":"Decodes your text from Base64",
		"author":"See Source",
		"icon":"metamorphose",
		"tags":"base64,btoa,decode"
	}
**/

import { decode } from "js-base64";

export function main(input) {
  input.text = decode(input.text);
}
