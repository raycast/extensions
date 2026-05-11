/**
	{
		"api":1,
		"name":"HTML Decode",
		"description":"Decodes HTML entities in your text",
		"author":"See Source",
		"icon":"HTML",
		"tags":"html,decode,web"
	}
**/

import { decode } from "he";

export function main(input) {
  input.text = decode(input.text);
}
