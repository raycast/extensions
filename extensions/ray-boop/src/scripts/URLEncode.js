/**
	{
		"api":1,
		"name":"URL Encode",
		"description":"Encodes URL entities in your text.",
		"author":"Ivan",
		"icon":"link",
		"tags":"url,encode,convert"
	}
**/

export function main(input) {
  input.text = encodeURIComponent(input.text);
}
