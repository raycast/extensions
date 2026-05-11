/**
	{
		"api":1,
		"name":"New Boop Script",
		"description":"Returns a basic Boop script.",
		"author":"tlewis",
		"icon":"quote",
		"tags":"boop,state,script,debug,new,create"
	}
**/

export function main(state) {
  try {
    state.text = script;
  } catch {
    state.postError("Something strange happened here...");
  }
}

var script = `
/**
	{
		"api":1,
		"name":"New Boop Script",
		"description":"What does your script do?",
		"author":"Whooooooo are you?",
		"icon":"broom",
        "tags":"place,tags,here",
        "bias":0.0
	}
**/

export function main(state) {
	try {
        
        /*
        The 'state' object has three properties to deal with text: text, fullText, and selection.

        state.text will contain or set the entire string from the editor, regardless of whether a selection is made or not.
        state.selection will contain or set the currently selected text, one at a time if more that one selection exists.
        Note: For Raycast extensions, use state.text for all operations.
        */

		state.text = state.selection; // Remove all but selected text
	}
	catch(error) {
		state.postError("Explain what went wrong here...")
	}
	
}
`;
