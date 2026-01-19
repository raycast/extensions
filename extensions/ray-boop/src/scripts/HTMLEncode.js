/**
	{
		"api":1,
		"name":"HTML Encode",
		"description":"Encodes HTML entities in your text",
		"author":"See Source",
		"icon":"HTML",
		"tags":"html,encode,web"
	}
**/

import { encode } from "he";

export function main(input) {
  input.text = encode(input.text);
}
