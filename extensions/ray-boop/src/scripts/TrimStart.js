/**
	{
		"api":1,
		"name":"Trim Start",
		"description":"Trims leading whitespace.",
		"author":"Joshua Nozzi",
		"icon":"scissors",
		"tags":"trim,start,left,leading,beginning,whitespace,empty,space",
	}
**/

export function main(state) {
  state.text = state.text.trimStart();
}
