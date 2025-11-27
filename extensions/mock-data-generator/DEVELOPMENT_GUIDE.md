# Mock Data Generator - Development Guide

## 🎯 Goal
Build a Raycast extension that generates mock data for Java and Python with customizable fields.

---

## 📋 Step-by-Step Implementation Plan

### Phase 1: Basic Structure (Start Here!)
1. Update the form with language selection
2. Add field management (add/remove fields)
3. Generate basic mock data
4. Add copy to clipboard functionality

### Phase 2: Advanced Features
1. Support multiple output formats per language
2. Add test framework support (JUnit, pytest)
3. Add validation and error handling
4. Polish UX with better previews

---

## 🔧 Useful Raycast Snippets

### 1. Basic Form with Language Selection (Map-Based)
```tsx
import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { LANGUAGES, OUTPUT_FORMATS } from "./constants/typeMapping";

export default function Command() {
  const [language, setLanguage] = useState<string>("java");
  const [outputFormat, setOutputFormat] = useState<string>("class");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="language"
        title="Language"
        value={language}
        onChange={setLanguage}
      >
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item 
            key={lang.id}
            value={lang.id} 
            title={`${lang.icon} ${lang.name}`} 
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="outputFormat"
        title="Output Format"
        value={outputFormat}
        onChange={setOutputFormat}
      >
        {OUTPUT_FORMATS[language as keyof typeof OUTPUT_FORMATS]?.map((format) => (
          <Form.Dropdown.Item
            key={format.id}
            value={format.id}
            title={format.name}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
```

### 2. Dynamic Field Management (Map-Based)
```tsx
import { Fragment } from "react";
import { FIELD_TYPES, COMMON_FIELD_SETS } from "./constants/typeMapping";

interface Field {
  id: string;
  name: string;
  type: string;
}

const [fields, setFields] = useState<Field[]>([
  { id: "1", name: "id", type: "integer" },
  { id: "2", name: "name", type: "string" },
]);

// Add field button action
<Action
  title="Add Field"
  onAction={() => {
    const newField: Field = {
      id: Date.now().toString(),
      name: "",
      type: "string",
    };
    setFields([...fields, newField]);
  }}
/>

// Remove last field button action
<Action
  title="Remove Last Field"
  onAction={() => {
    if (fields.length > 1) {
      setFields(fields.slice(0, -1));
    }
  }}
/>

// Load predefined field set
<Action
  title="Load User Template"
  onAction={() => {
    const userFields = COMMON_FIELD_SETS.user.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      ...f,
    }));
    setFields(userFields);
  }}
/>

// Render fields dynamically - map over both fields AND field types
{fields.map((field, index) => (
  <Fragment key={field.id}>
    <Form.TextField
      id={`field-name-${field.id}`}
      title={`Field ${index + 1} Name`}
      placeholder="e.g., username"
      value={field.name}
      onChange={(value) => {
        const updated = [...fields];
        updated[index].name = value;
        setFields(updated);
      }}
    />
    <Form.Dropdown
      id={`field-type-${field.id}`}
      title={`Field ${index + 1} Type`}
      value={field.type}
      onChange={(value) => {
        const updated = [...fields];
        updated[index].type = value;
        setFields(updated);
      }}
    >
      {FIELD_TYPES.map((type) => (
        <Form.Dropdown.Item
          key={type.id}
          value={type.id}
          title={type.name}
        />
      ))}
    </Form.Dropdown>
  </Fragment>
))}
```

### 3. Copy to Clipboard Action
```tsx
import { Action, Clipboard, showToast, Toast } from "@raycast/api";

// In your ActionPanel
<Action
  title="Copy to Clipboard"
  onAction={async () => {
    await Clipboard.copy(generatedCode);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard!",
    });
  }}
  shortcut={{ modifiers: ["cmd"], key: "c" }}
/>
```

### 4. Show Generated Code with Detail View
```tsx
import { Detail } from "@raycast/api";

// In a separate component or conditional render
<Detail
  markdown={`\`\`\`${language}\n${generatedCode}\n\`\`\``}
  actions={
    <ActionPanel>
      <Action.CopyToClipboard content={generatedCode} />
      <Action.Paste content={generatedCode} />
    </ActionPanel>
  }
/>
```

---

## 🔨 Generator Function Templates (Map-Based Approach)

### Shared Types & Constants
```typescript
// types/index.ts

export interface Field {
  name: string;
  type: FieldType;
}

export type FieldType = "string" | "integer" | "boolean" | "date" | "array";

export type Language = "java" | "python";

export type OutputFormat = "class" | "record" | "dict" | "dataclass" | "pydantic";
```

```typescript
// constants/typeMapping.ts

// Language configurations
export const LANGUAGES = [
  { id: "java", name: "Java", icon: "☕" },
  { id: "python", name: "Python", icon: "🐍" },
] as const;

// Output format configurations per language
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
} as const;

// Field type configurations
export const FIELD_TYPES = [
  { id: "string", name: "String" },
  { id: "integer", name: "Integer" },
  { id: "boolean", name: "Boolean" },
  { id: "date", name: "Date" },
  { id: "array", name: "Array" },
] as const;

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
```

### Java Generator Example
```typescript
// generators/java.ts
import { Field } from "../types";
import { JAVA_TYPE_MAP } from "../constants/typeMapping";

export function generateJavaClass(className: string, fields: Field[]): string {
  const fieldDeclarations = fields
    .map((f) => `    private ${JAVA_TYPE_MAP[f.type]} ${f.name};`)
    .join("\n");

  const getters = fields
    .map((f) => {
      const type = JAVA_TYPE_MAP[f.type];
      const methodName = capitalize(f.name);
      return `
    public ${type} get${methodName}() {
        return ${f.name};
    }`;
    })
    .join("\n");

  const setters = fields
    .map((f) => {
      const type = JAVA_TYPE_MAP[f.type];
      const methodName = capitalize(f.name);
      return `
    public void set${methodName}(${type} ${f.name}) {
        this.${f.name} = ${f.name};
    }`;
    })
    .join("\n");

  return `public class ${className} {
${fieldDeclarations}

    public ${className}() {
    }
${getters}
${setters}
}`;
}

export function generateJavaRecord(recordName: string, fields: Field[]): string {
  const params = fields
    .map((f) => `${JAVA_TYPE_MAP[f.type]} ${f.name}`)
    .join(", ");

  return `public record ${recordName}(${params}) {}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### Python Generator Example
```typescript
// generators/python.ts
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
    ? "from dataclasses import dataclass\nfrom datetime import date\n"
    : "from dataclasses import dataclass\n";

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
```

### Main Generator Hub (Map-Based Router)
```typescript
// generators/index.ts
import { Field, Language, OutputFormat } from "../types";
import { generateJavaClass, generateJavaRecord } from "./java";
import { generatePythonDict, generatePythonDataclass, generatePydanticModel } from "./python";

type GeneratorFunction = (className: string, fields: Field[]) => string;

// Map of language -> format -> generator function
const GENERATOR_MAP: Record<Language, Record<string, GeneratorFunction>> = {
  java: {
    class: generateJavaClass,
    record: generateJavaRecord,
  },
  python: {
    dict: (_, fields) => generatePythonDict(fields), // dict doesn't need className
    dataclass: generatePythonDataclass,
    pydantic: generatePydanticModel,
  },
};

export function generateMockData(
  language: Language,
  format: OutputFormat,
  className: string,
  fields: Field[]
): string {
  const generator = GENERATOR_MAP[language]?.[format];
  
  if (!generator) {
    throw new Error(`No generator found for ${language} with format ${format}`);
  }
  
  return generator(className, fields);
}
```

---

## 📁 Suggested File Structure

```
mock-data-generator/
├── src/
│   ├── generate-mock-data.tsx    # Main form component
│   ├── components/
│   │   ├── FieldManager.tsx      # Reusable field management component
│   │   └── CodePreview.tsx       # Preview generated code
│   ├── generators/
│   │   ├── java.ts               # Java generators
│   │   ├── python.ts             # Python generators
│   │   └── index.ts              # Export all generators
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   └── utils/
│       └── helpers.ts            # Helper functions
```

---

## 🚀 Quick Start Implementation Order

1. **Start Simple**: Create a form with hardcoded fields (id, name, email) and language dropdown
2. **Add Generator**: Implement one generator function (e.g., Java POJO class)
3. **Test It**: Make sure copy to clipboard works
4. **Add Dynamic Fields**: Implement add/remove field functionality
5. **Add More Formats**: Add Python dict, then dataclass
6. **Polish**: Add validation, better UX, more output formats

---

## 💡 Tips

- **Keep generators pure**: Each generator function should just take data and return a string
- **Start with simple formats**: POJO and dict are easiest to implement
- **Test each format**: Copy generated code and try compiling/running it
- **Add examples**: Include a "Use Example" button that populates common field sets
- **Consider mock values**: Later you could add realistic mock data (faker-like values)

---

## 🧪 Testing Your Generators

```typescript
// Quick test in your component
import { generateMockData } from "./generators";
import { COMMON_FIELD_SETS } from "./constants/typeMapping";

// Test with predefined field set
console.log(generateMockData("java", "class", "User", COMMON_FIELD_SETS.user));
console.log(generateMockData("python", "dataclass", "User", COMMON_FIELD_SETS.user));

// Test with custom fields
const customFields = [
  { name: "id", type: "integer" as const },
  { name: "username", type: "string" as const },
];
console.log(generateMockData("java", "record", "User", customFields));
```

## 🎯 Benefits of This Approach

✅ **Centralized type mappings** - Easy to update in one place  
✅ **Predefined templates** - Users can quickly select common field sets  
✅ **Easy to extend** - Just add to the maps to support new types/formats  
✅ **Type-safe** - TypeScript will catch errors at compile time  
✅ **Clean separation** - Constants, types, and generators are separate  
✅ **Simple routing** - One function maps to all generators  

Good luck building! 🎉
