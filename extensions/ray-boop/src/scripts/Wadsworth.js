/**
	{
		"api":1,
		"name":"Wadsworth Constant",
		"description":"first 30% of your text.",
		"author":"Ivan",
		"icon":"scissors",
		"tags":"snap"
	}
**/

export function main(state) {
  var all = state.text.split(" ");
  all.splice(0, Math.ceil(all.length * 0.3));
  state.text = all.join(" ");
}
