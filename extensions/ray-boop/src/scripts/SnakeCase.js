/**
	{
		"api":1,
		"name":"Snake Case",
		"description":"converts_your_text_to_snake_case.",
		"author":"Ivan",
		"icon":"snake",
		"tags":"snake,case,function"
	}
**/

// Simple snakeCase implementation without lodash dependency
function toSnakeCase(str) {
  return str
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join("_");
}

export function main(input) {
  input.text = toSnakeCase(input.text);
}
