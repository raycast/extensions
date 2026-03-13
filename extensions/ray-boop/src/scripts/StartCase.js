/**
	{
		"api":1,
		"name":"Start Case",
		"description":"Converts Your Text To Start Case.",
		"author":"Ivan",
		"icon":"type",
		"tags":"start,case,function"
	}
**/

// Simple startCase implementation without lodash dependency
function toStartCase(str) {
  return str
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function main(input) {
  input.text = toStartCase(input.text);
}
