import { jsonRootName } from "../utils/jsonRootName";
import { SwiftType } from "../utils/types";
import { quicktype, InputData, jsonInputForTargetLanguage } from "quicktype-core";

export async function convertSwift(jsonValue: string, type: SwiftType, name?: string) {
  let rootName = name;
  if (!rootName) {
    rootName = jsonRootName(jsonValue);
  }
  if (type === SwiftType.Struct) {
    return await convertSwiftStruct(jsonValue, rootName, SwiftType.Struct);
  } else if (type === SwiftType.Class) {
    return await convertSwiftClass(jsonValue, rootName, SwiftType.Class);
  }
  return null;
}

async function convertSwiftStruct(jsonValue: string, name: string, type: SwiftType): Promise<string> {
  return quickTypeJSON(jsonValue, name, type);
}

async function convertSwiftClass(jsonValue: string, name: string, type: SwiftType): Promise<string> {
  return quickTypeJSON(jsonValue, name, type);
}

async function quickTypeJSON(jsonValue: string, name: string, type: SwiftType) {
  const jsonInput = jsonInputForTargetLanguage("swift");

  await jsonInput.addSource({
    name: name,
    samples: [jsonValue],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: "swift",
    rendererOptions: {
      "just-types": true,
      "struct-or-class": type === SwiftType.Class ? "class" : "struct",
    },
  });

  return result.lines.join("\n");
}
