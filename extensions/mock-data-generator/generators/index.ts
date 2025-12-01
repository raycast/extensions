import { Field, LanguageId, OutputFormat, GeneratorFunction } from "../types";
import { generateJavaClass, generateJavaRecord, generateJavaBuilder } from "./java";
import { generatePythonDict, generatePythonDataclass, generatePydanticModel } from "./python";
import { generateTSInterface, generateTSClass, generateTSType, generateZodSchema } from "./typescript";
import { generateJSClass, generateJSObject } from "./javascript";

const GENERATOR_MAP: Record<LanguageId, Record<string, GeneratorFunction>> = {
  java: {
    class: generateJavaClass,
    record: generateJavaRecord,
    builder: generateJavaBuilder,
  },
  python: {
    dict: generatePythonDict,
    dataclass: generatePythonDataclass,
    pydantic: generatePydanticModel,
  },
  javascript: {
    object: generateJSObject,
    "class-js": generateJSClass,
  },
  typescript: {
    interface: generateTSInterface,
    type: generateTSType,
    "class-ts": generateTSClass,
    zod: generateZodSchema,
  },
};

export function generateMockData(
  language: LanguageId,
  format: OutputFormat,
  className: string,
  fields: Field[],
  count: number = 1,
): string {
  const generator = GENERATOR_MAP[language]?.[format];

  if (!generator) {
    throw new Error(`No generator found for ${language} with format ${format}`);
  }

  return generator(className, fields, count);
}
