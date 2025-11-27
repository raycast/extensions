import type { Language } from '../types/index';
import { FaJava, FaPython } from 'react-icons/fa';

export const LANGUAGES: Language[] = [
    { id: "java", name: "Java", icon: FaJava},
    { id: "python", name: "Python", icon: FaPython }
] as const;

export const OUTPUT_FORMATS = {
    java: [
        { id: "class", name: "POJO Class"},
        { id: "record", name: "Record (Java 14+)"},
        { id: "builder", name: "Builder Pattern"}
    ],

    python: [
        { id: "dict", name: "Dictionary"},
        { id: "dataclass", name: "Dataclass"},
        { id: "pydantic", name: "Pydantic Model"}
    ]
} as const;

export const JAVA_TYPE_MAP: Record<string, string> = {
  string: "String",
  integer: "Integer",
  boolean: "Boolean",
  date: "LocalDate",
  array: "List<String>",
};

export const PYTHON_TYPE_MAP: Record<string, string> = {
  string: "str",
  integer: "int",
  boolean: "bool",
  date: "date",
  array: "List[str]",
};

export const PYTHON_VALUE_MAP: Record<string, string> = {
  string: '"example_string"',
  integer: "0",
  boolean: "True",
  date: '"2024-01-01"',
  array: "[]",
};

// Predefined field templates - users can select from these
export const COMMON_FIELD_SETS = {
  user: [
    { name: "id", type: "integer" as const },
    { name: "username", type: "string" as const },
    { name: "email", type: "string" as const },
    { name: "isActive", type: "boolean" as const },
  ],
  product: [
    { name: "id", type: "integer" as const },
    { name: "name", type: "string" as const },
    { name: "price", type: "integer" as const },
    { name: "inStock", type: "boolean" as const },
  ],
  blog: [
    { name: "id", type: "integer" as const },
    { name: "title", type: "string" as const },
    { name: "content", type: "string" as const },
    { name: "publishedDate", type: "date" as const },
    { name: "tags", type: "array" as const },
  ],
};