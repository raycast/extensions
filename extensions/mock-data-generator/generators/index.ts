import { Field, LanguageId, OutputFormat } from "../types";
import { generateJavaClass, generateJavaRecord, generateJavaBuilder } from "./java";
import { generatePythonDict, generatePythonDataclass, generatePydanticModel } from "./python";

type GeneratorFunction = (className: string, fields: Field[]) => string;

const GENERATOR_MAP: Record<LanguageId, Record<string, GeneratorFunction>> = {
    java: {
        class: generateJavaClass,
        record: generateJavaRecord,
        builder: generateJavaBuilder,
    },
    python: {
        dict: (_, fields) => generatePythonDict(fields),
        dataclass: generatePythonDataclass,
        pydantic: generatePydanticModel
    },
};

export function generateMockData(
    language: LanguageId,
    format: OutputFormat,
    className: string,
    fields: Field[]
): string {
    const generator = GENERATOR_MAP[language]?.[format];

    if (!generator) {
        throw new Error(`No generator found for ${language} with format ${format}`)
    }

    return generator(className, fields);
}