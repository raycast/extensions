/**
	{
		"api":1,
		"name":"Format JSON",
		"description":"Cleans and format JSON documents.",
		"author":"Ivan",
		"icon":"broom",
		"tags":"json,prettify,clean,indent"
	}
**/

export function main(state) {
  try {
    // I feel like this should have a real parser/formatter
    // but hey, it works so who am I to judge?
    state.text = JSON.stringify(JSON.parse(state.text), null, 2);
  } catch {
    state.postError("Invalid JSON");
  }
}
