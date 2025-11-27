import { Field } from "../types";
import { PYTHON_TYPE_MAP, PYTHON_VALUE_MAP } from "../constants/typeMapping";

export function generatePythonDict(fields: Field[]): string {
  const fieldValues = fields
    .map((f) => `    "${f.name}": ${PYTHON_VALUE_MAP[f.type]}`)
    .join(",\n");

  return `mock_data = {
${fieldValues}
}`;
}

export function generatePythonDataclass(className: string, fields: Field[]): string {
  const needsDateImport = fields.some((f) => f.type === "date");
  const imports = needsDateImport
    ? "from dataclasses import dataclass\nfrom datetime import date"
    : "from dataclasses import dataclass";

  const fieldDeclarations = fields
    .map((f) => `    ${f.name}: ${PYTHON_TYPE_MAP[f.type]}`)
    .join("\n");

  return `${imports}

@dataclass
class ${className}:
${fieldDeclarations}`;
}

export function generatePydanticModel(className: string, fields: Field[]): string {
  const needsDateImport = fields.some((f) => f.type === "date");
  const needsListImport = fields.some((f) => f.type === "array");

  const imports = ["from pydantic import BaseModel"];
  if (needsDateImport) imports.push("from datetime import date");
  if (needsListImport) imports.push("from typing import List");

  const fieldDeclarations = fields
    .map((f) => `    ${f.name}: ${PYTHON_TYPE_MAP[f.type]}`)
    .join("\n");

  return `${imports.join("\n")}

class ${className}(BaseModel):
${fieldDeclarations}`;
}
