import type { IconType } from 'react-icons';

export interface Field {
    name: string;
    type: FieldType;
}

export type Language = {
    id: string;
    name: string;
    icon: IconType;
}

export type LanguageId = "java" | "python";
export type FieldType = "string" | "integer" | "boolean" | "date" | "array";
export type OutputFormat = "class" | "record" | "dict" | "dataclass" | "pydantic";
