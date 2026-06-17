/**
	{
		"api":1,
		"name":"Join Lines With Comma",
		"description":"Joins all lines with a comma.",
		"author":"riesentoaster",
		"icon":"collapse",
		"tags":"join, comma",
		"bias": -0.1
	}
**/

export function main(input) {
  input.text = input.text.replace(/\n/g, ",");
}
