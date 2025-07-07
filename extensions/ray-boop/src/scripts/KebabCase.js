/**
	{
		"api":1,
		"name":"Kebab Case",
		"description":"converts-your-text-to-kebab-case.",
		"author":"Ivan",
		"icon":"kebab",
		"tags":"kebab,case,function"
	}
**/

// Simple kebabCase implementation without lodash dependency
function toKebabCase(str) {
  return str
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join("-");
}

export function main(input) {
  input.text = toKebabCase(input.text);
}
