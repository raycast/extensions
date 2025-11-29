import { Field } from "../types";
import { PYTHON_TYPE_MAP, PYTHON_VALUE_MAP } from "../constants/typeMapping";
import { generateRandomValue, formatValueForLanguage } from "../utils/randomData";

export function generatePythonDict(className: string, fields: Field[], count: number = 1): string {
  if (count === 1) {
    const fieldValues = fields.map((f) => `    "${f.name}": ${PYTHON_VALUE_MAP[f.type]}`).join(",\n");
    return `${camelCase(className)} = {\n${fieldValues}\n}`;
  }

  // Generate multiple dictionaries with random data
  const instances = Array.from({ length: count }, () => {
    const dictFields = fields.map((f) => {
      const randomValue = generateRandomValue(f.type, f.name);
      const formattedValue = formatValueForLanguage(randomValue, "python", f.type);
      return `        "${f.name}": ${formattedValue}`;
    });
    return `    {\n${dictFields.join(",\n")}\n    }`;
  });

  return `${camelCase(className)}_list = [\n${instances.join(",\n")}\n]`;
}

export function generatePythonDataclass(className: string, fields: Field[], count: number = 1): string {
  const needsDateImport = fields.some((f) => f.type === "date");
  const needsListImport = fields.some((f) => f.type === "array");

  const imports = ["from dataclasses import dataclass"];
  if (needsDateImport) {
    imports.push("from datetime import datetime");
  }
  if (needsListImport) {
    imports.push("from typing import List");
  }

  const fieldDeclarations = fields.map((f) => `    ${f.name}: ${PYTHON_TYPE_MAP[f.type]}`).join("\n");

  const classDefinition = `${imports.join("\n")}

@dataclass
class ${className}:
${fieldDeclarations}`;

  if (count === 1) {
    return classDefinition;
  }

  const instances = generatePythonInstances(className, fields, count);

  return `${classDefinition}

# Generated ${count} sample instances
${camelCase(className)}_list = [\n${instances}\n]`;
}

export function generatePydanticModel(className: string, fields: Field[], count: number = 1): string {
  const needsDateImport = fields.some((f) => f.type === "date");
  const needsListImport = fields.some((f) => f.type === "array");

  const imports = ["from pydantic import BaseModel"];
  if (needsDateImport) {
    imports.push("from datetime import datetime");
  }
  if (needsListImport) {
    imports.push("from typing import List");
  }

  const fieldDeclarations = fields.map((f) => `    ${f.name}: ${PYTHON_TYPE_MAP[f.type]}`).join("\n");

  const modelDefinition = `${imports.join("\n")}

class ${className}(BaseModel):
${fieldDeclarations}`;

  if (count === 1) {
    return modelDefinition;
  }

  const instances = generatePythonInstances(className, fields, count);

  return `${modelDefinition}

# Generated ${count} sample instances
${camelCase(className)}_list = [\n${instances}\n]`;
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function generatePythonInstances(className: string, fields: Field[], count: number): string {
  const instances = Array.from({ length: count }, () => {
    const values = fields.map((f) => {
      const randomValue = generateRandomValue(f.type, f.name);
      const formattedValue = formatValueForLanguage(randomValue, "python", f.type);
      return `        ${f.name}=${formattedValue}`;
    });
    return `    ${className}(\n${values.join(",\n")}\n    )`;
  });

  return instances.join(",\n");
}