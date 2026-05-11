/**
	{
		"api":1,
		"name":"Trim End",
		"description":"Trims trailing whitespace.",
		"author":"Joshua Nozzi",
		"icon":"scissors",
		"tags":"trim,end,right,trailing,whitespace,empty,space",
	}
**/

export function main(state) {
  state.text = state.text.trimEnd();
}
