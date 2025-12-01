import type { IconType } from "react-icons";

export type GeneratorFunction = (className: string, fields: Field[], count?: number) => string;

export interface Field {
  name: string;
  type: FieldType;
}

export type Language = {
  id: string;
  name: string;
  icon: IconType;
};

export type LanguageId = "java" | "python" | "javascript" | "typescript";
export type FieldType = "string" | "integer" | "boolean" | "date" | "array";
export type OutputFormat = 
    // java
    | "class" 
    | "record"
    // python
    | "dict" 
    | "dataclass" 
    | "pydantic"
    // ts
    | "interface"
    | "type"
    | "class-ts"
    | "zod"
    // js
    | "object"
    | "class-js"