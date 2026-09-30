/**
	{
		"api":1  } catch {
    state.postError("Invalid JSON");
  }	"name":"JSON to YAML",
		"description":"Converts JSON to YAML.",
		"author":"Ivan",
		"icon":"metamorphose",
		"tags":"markup,convert"
	}
**/

import yaml from "js-yaml";

export function main(input) {
  try {
    input.text = yaml.safeDump(JSON.parse(input.text));
  } catch {
    input.postError("Invalid JSON");
  }
}
