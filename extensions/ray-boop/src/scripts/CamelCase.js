/**
	{
		"api":1,
		"name":"Camel Case",
		"description":"convertsYourTextToCamelCase",
		"author":"Ivan",
		"icon":"camel",
		"tags":"camel,case,function"
	}
**/

// Simple camelCase implementation without lodash dependency
function toCamelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

export function main(input) {
  input.text = toCamelCase(input.text);
}
