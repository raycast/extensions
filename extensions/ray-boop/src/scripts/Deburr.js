/**
	{
		"api":1,
		"name":"Deburr",
		"description":"Converts your text to basic latin characters.",
		"author":"Ivan",
		"icon":"colosseum",
		"tags":"burr,special,characters,function"
	}
**/

// Simple deburr implementation without lodash dependency
function deburr(str) {
  // Normalize to NFD (decomposed form) and remove combining characters
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function main(input) {
  input.text = deburr(input.text);
}
