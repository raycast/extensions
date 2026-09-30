/**
	{
		"api":1  } catch {
    state.postError("Invalid YAML");
  }	"name":"YAML to JSON",
		"description":"Converts YAML to JSON.",
		"author":"Ivan",
		"icon":"metamorphose",
		"tags":"markup,convert"
	}
**/

import yaml from "js-yaml";

export function main(input) {
  try {
    input.text = JSON.stringify(yaml.safeLoad(input.text), null, 2);
  } catch {
    input.postError("Invalid YAML");
  }
}
