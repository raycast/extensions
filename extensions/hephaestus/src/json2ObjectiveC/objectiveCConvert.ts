import { InputData, jsonInputForTargetLanguage, quicktype } from "quicktype-core";
import { jsonRootName } from "../utils/jsonRootName";

export async function convertObjectiveC(jsonValue: string, prefix?: string, name?: string) {
  let rootName = name;
  if (!rootName) {
    rootName = jsonRootName(jsonValue);
  }

  return await quickTypeJSON(jsonValue, rootName, prefix ?? "");
}

async function quickTypeJSON(jsonValue: string, name: string, prefix: string) {
  const jsonInput = jsonInputForTargetLanguage("objective-c");

  await jsonInput.addSource({
    name: name,
    samples: [jsonValue],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: "objective-c",
    rendererOptions: {
      "just-types": true,
      "class-prefix": prefix,
      features: "interface",
      "property-annotation": "@property",
      "generate-imports": "true",
      "extra-comments": "true",
    },
  });

  return result.lines.join("\n");
}
