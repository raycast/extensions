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

export function main(input) {
  input.text = Buffer.from(input.text, "base64").toString("utf8");
}
