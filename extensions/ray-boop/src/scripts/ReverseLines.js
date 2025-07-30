/**
	{
		"api":1,
		"name":"Reverse Lines",
		"description":"Flips every line of your text.",
		"author":"@Clarko",
		"icon":"flip",
		"tags":"reverse,order,invert,mirror,flip,upside,down"
	}
**/

export function main(input) {
  input.text = input.text.split("\n").reverse().join("\n");
}
