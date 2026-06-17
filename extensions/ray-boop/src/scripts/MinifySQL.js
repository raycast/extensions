/**
	{
		"api":1,
		"name":"Minify SQL",
		"description":"Cleans and minifies SQL queries.",
		"author":"Ivan",
		"icon":"broom",
		"tags":"mysql,sql,minify,clean,indent",
        "bias": -0.1
	}
**/

import vkbeautify from "vkbeautify";

export function main(state) {
  state.text = vkbeautify.sqlmin(state.text);
}
