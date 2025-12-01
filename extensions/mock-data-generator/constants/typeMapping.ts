import type { Language, FieldType } from "../types/index";
import { FaJava, FaPython } from "react-icons/fa";
import { SiJavascript, SiTypescript } from "react-icons/si";

export const LANGUAGES: Language[] = [
  { id: "java", name: "Java", icon: FaJava },
  { id: "python", name: "Python", icon: FaPython },
  { id: "javascript", name: "JavaScript", icon: SiJavascript },
  { id: "typescript", name: "TypeScript", icon: SiTypescript },
] as const;

export const OUTPUT_FORMATS = {
  java: [
    { id: "class", name: "POJO Class" },
    { id: "record", name: "Record (Java 14+)" },
    { id: "builder", name: "Builder Pattern" },
  ],

  python: [
    { id: "dict", name: "Dictionary" },
    { id: "dataclass", name: "Dataclass" },
    { id: "pydantic", name: "Pydantic Model" },
  ],

  javascript: [
    { id: "object", name: "Object Literal" },
    { id: "class-js", name: "Class" },
  ],

  typescript: [
    { id: "interface", name: "Interface" },
    { id: "type", name: "Type Alias" },
    { id: "class-ts", name: "Class" },
    { id: "zod", name: "Zod Schema" },
  ],
} as const;

export const JAVA_TYPE_MAP: Record<FieldType, string> = {
  string: "String",
  integer: "Integer",
  boolean: "Boolean",
  date: "LocalDate",
  array: "List<String>",
};

export const PYTHON_TYPE_MAP: Record<FieldType, string> = {
  string: "str",
  integer: "int",
  boolean: "bool",
  date: "date",
  array: "List[str]",
};

export const PYTHON_VALUE_MAP: Record<FieldType, string> = {
  string: '"example_string"',
  integer: "0",
  boolean: "True",
  date: '"2024-01-01"',
  array: "[]",
};

export const JS_TYPE_MAP: Record<FieldType, string> = {
  string: "string",
  integer: "number",
  boolean: "boolean",
  date: "Date",
  array: "Array"
};

export const TS_TYPE_MAP: Record<FieldType, string> = {
  string: "string",
  integer: "number",
  boolean: "boolean",
  date: "Date",
  array: "string[]"
};

// Predefined field templates - users can select from these
export const COMMON_FIELD_SETS = {
  user: [
    { name: "id", type: "integer" as FieldType },
    { name: "username", type: "string" as FieldType },
    { name: "email", type: "string" as FieldType },
    { name: "isActive", type: "boolean" as FieldType },
  ],
  product: [
    { name: "id", type: "integer" as FieldType },
    { name: "name", type: "string" as FieldType },
    { name: "price", type: "integer" as FieldType },
    { name: "inStock", type: "boolean" as FieldType },
  ],
  blog: [
    { name: "id", type: "integer" as FieldType },
    { name: "title", type: "string" as FieldType },
    { name: "content", type: "string" as FieldType },
    { name: "publishedDate", type: "date" as FieldType },
    { name: "tags", type: "array" as FieldType },
  ],
};