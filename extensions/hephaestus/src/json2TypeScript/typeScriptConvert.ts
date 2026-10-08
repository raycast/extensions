import { InputData, jsonInputForTargetLanguage, quicktype } from "quicktype-core";
import { jsonRootName } from "../utils/jsonRootName";

export async function convertTypeScript(jsonValue: string, name?: string) {
  let rootName = name;
  if (!rootName) {
    rootName = jsonRootName(jsonValue);
  }
  return await quickTypeJSON(jsonValue, rootName);
}

async function quickTypeJSON(jsonValue: string, name: string) {
  const jsonInput = jsonInputForTargetLanguage("typescript");
  await jsonInput.addSource({
    name: name,
    samples: [jsonValue],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: "typescript",
    rendererOptions: {
      "just-types": true,
      "nice-types": true,
      "explicit-unions": true,
    },
  });

  return result.lines.join("\n");
}
