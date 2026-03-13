/**
	{
		"api":1,
		"name":"Minify CSS",
		"description":"Cleans and minifies CSS stylesheets.",
		"author":"Ivan",
		"icon":"broom",
		"tags":"css,minify,clean,indent",
        "bias": -0.1
	}
**/

import vkbeautify from "vkbeautify";

export function main(state) {
  state.text = vkbeautify.cssmin(state.text);
}
