/**
	{
		"api":1,
		"name":"Add Slashes",
		"description":"Escapes your text.",
		"author":"Ivan",
		"icon":"quote",
		"tags":"add,slashes,escape"
	}
**/

export function main(input) {
  //  discuss at: http://locutus.io/php/addslashes/
  // original by: Kevin van Zonneveld (http://kvz.io)
  // improved by: Ates Goral (http://magnetiq.com)
  // improved by: marrtins
  // improved by: Nate
  // improved by: Onno Marsman (https://twitter.com/onnomarsman)
  // improved by: Brett Zamir (http://brett-zamir.me)
  // improved by: Oskar Larsson Högfeldt (http://oskar-lh.name/)
  //    input by: Denny Wardhana
  //   example 1: addslashes("kevin's birthday")
  //   returns 1: "kevin\\'s birthday"

  input.text = (input.text + "").replace(/[\\"']/g, "\\$&").replace(/\0/g, "\\0");
}
