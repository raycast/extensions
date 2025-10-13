/**
	{
		"api":1,
		"name":"Minify JSON",
		"description":"Cleans and minifies JSON documents.",
		"author":"riesentoaster",
		"icon":"broom",
		"tags":"html,minify,clean,indent",
        "bias": -0.1
	}
**/

export function main(input) {
  input.text = JSON.stringify(JSON.parse(input.text));
}
