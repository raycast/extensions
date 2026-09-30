/**
	{
		"api":1,
		"name":"Format SQL",
		"description":"Cleans and format SQL queries.",
		"author":"Ivan",
		"icon":"broom",
		"tags":"mysql,sql,prettify,clean,indent",
        "bias": -0.1
	}
**/

import vkbeautify from "vkbeautify";

export function main(state) {
  state.text = vkbeautify.sql(state.text);
}
