/**
	{
		"api":1,
		"name":"Trim",
		"description":"Trims leading and trailing whitespace.",
		"author":"Joshua Nozzi",
		"icon":"scissors",
		"tags":"trim,whitespace,empty,space",
	}
**/

export function main(state) {
  state.text = state.text.trim();
}
