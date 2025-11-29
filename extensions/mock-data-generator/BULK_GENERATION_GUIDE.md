# Bulk Record Generation Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing bulk record generation with realistic random data using `@faker-js/faker`.

## 1. Install Faker.js

```bash
cd /d/projects/mock-data-raycast/mock-data-generator
npm install @faker-js/faker
```

## 2. Create Random Data Generator Utility

Create `utils/randomData.ts`:

```typescript
import { faker } from '@faker-js/faker';
import type { FieldType } from '../types';

/**
 * Generates a random value based on field type and name
 * Uses smart detection to generate contextually appropriate data
 */
export function generateRandomValue(fieldType: FieldType, fieldName: string): any {
  const lowerName = fieldName.toLowerCase();

  switch (fieldType) {
    case 'string':
      // Smart field name detection for strings
      if (lowerName.includes('email')) {
        return faker.internet.email();
      }
      if (lowerName.includes('username') || lowerName === 'user') {
        return faker.internet.username();
      }
      if (lowerName.includes('firstname') || lowerName === 'fname') {
        return faker.person.firstName();
      }
      if (lowerName.includes('lastname') || lowerName === 'lname') {
        return faker.person.lastName();
      }
      if (lowerName.includes('name')) {
        return faker.person.fullName();
      }
      if (lowerName.includes('title')) {
        return faker.lorem.sentence(3);
      }
      if (lowerName.includes('description') || lowerName.includes('content')) {
        return faker.lorem.paragraph();
      }
      if (lowerName.includes('address')) {
        return faker.location.streetAddress();
      }
      if (lowerName.includes('city')) {
        return faker.location.city();
      }
      if (lowerName.includes('country')) {
        return faker.location.country();
      }
      if (lowerName.includes('phone')) {
        return faker.phone.number();
      }
      if (lowerName.includes('company')) {
        return faker.company.name();
      }
      if (lowerName.includes('url') || lowerName.includes('website')) {
        return faker.internet.url();
      }
      if (lowerName.includes('color')) {
        return faker.color.human();
      }
      // Default string
      return faker.lorem.word();

    case 'integer':
      if (lowerName.includes('age')) {
        return faker.number.int({ min: 18, max: 80 });
      }
      if (lowerName.includes('year')) {
        return faker.number.int({ min: 1900, max: 2025 });
      }
      if (lowerName.includes('price') || lowerName.includes('cost')) {
        return faker.number.int({ min: 10, max: 1000 });
      }
      if (lowerName.includes('quantity') || lowerName.includes('count')) {
        return faker.number.int({ min: 1, max: 100 });
      }
      if (lowerName.includes('id')) {
        return faker.number.int({ min: 1, max: 10000 });
      }
      // Default integer
      return faker.number.int({ min: 1, max: 1000 });

    case 'boolean':
      if (lowerName.includes('active') || lowerName.includes('enabled')) {
        return faker.datatype.boolean(0.8); // 80% true
      }
      if (lowerName.includes('verified') || lowerName.includes('confirmed')) {
        return faker.datatype.boolean(0.7); // 70% true
      }
      // Default boolean (50/50)
      return faker.datatype.boolean();

    case 'date':
      if (lowerName.includes('birth') || lowerName.includes('dob')) {
        return faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString();
      }
      if (lowerName.includes('created')) {
        return faker.date.past({ years: 2 }).toISOString();
      }
      if (lowerName.includes('updated') || lowerName.includes('modified')) {
        return faker.date.recent({ days: 30 }).toISOString();
      }
      if (lowerName.includes('published')) {
        return faker.date.past({ years: 1 }).toISOString();
      }
      // Default date (past year)
      return faker.date.past().toISOString();

    case 'array':
      if (lowerName.includes('tags') || lowerName.includes('categories')) {
        return Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => 
          faker.lorem.word()
        );
      }
      if (lowerName.includes('email')) {
        return Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => 
          faker.internet.email()
        );
      }
      // Default array
      return Array.from({ length: 3 }, () => faker.lorem.word());

    default:
      return faker.lorem.word();
  }
}

/**
 * Format value according to the target language
 */
export function formatValueForLanguage(value: any, language: 'java' | 'python', fieldType: FieldType): string {
  if (language === 'java') {
    return formatValueForJava(value, fieldType);
  }
  return formatValueForPython(value, fieldType);
}

function formatValueForJava(value: any, fieldType: FieldType): string {
  switch (fieldType) {
    case 'string':
      return `"${value}"`;
    case 'integer':
      return value.toString();
    case 'boolean':
      return value.toString();
    case 'date':
      return `LocalDateTime.parse("${value}")`;
    case 'array':
      const items = Array.isArray(value) ? value : [value];
      return `Arrays.asList(${items.map(v => `"${v}"`).join(', ')})`;
    default:
      return `"${value}"`;
  }
}

function formatValueForPython(value: any, fieldType: FieldType): string {
  switch (fieldType) {
    case 'string':
      return `"${value}"`;
    case 'integer':
      return value.toString();
    case 'boolean':
      return value ? 'True' : 'False';
    case 'date':
      return `"${value}"`;
    case 'array':
      const items = Array.isArray(value) ? value : [value];
      return `[${items.map(v => `"${v}"`).join(', ')}]`;
    default:
      return `"${value}"`;
  }
}
```

## 3. Update Types

Add to `types/index.ts`:

```typescript
// Add count parameter to generator functions
export interface GeneratorFunction {
  (className: string, fields: Field[], count?: number): string;
}
```

## 4. Update Main Component

In `src/generate-mock-data.tsx`, add state and UI:

```typescript
// Add to imports
import { showToast, Toast } from "@raycast/api";

// Add to state (around line 20)
const [recordCount, setRecordCount] = useState<number>(1);

// Add Form field after outputFormat dropdown (around line 80)
<Form.Dropdown
  id="outputFormat"
  title="Output Format"
  value={outputFormat}
  onChange={(newValue) => setOutputFormat(newValue as string)}
>
  {OUTPUT_FORMATS[language].map((format) => (
    <Form.Dropdown.Item key={format} title={format} value={format} />
  ))}
</Form.Dropdown>

{/* NEW: Add this TextField */}
<Form.TextField
  id="recordCount"
  title="Number of Records"
  placeholder="1"
  value={recordCount.toString()}
  onChange={(value) => {
    const num = parseInt(value) || 1;
    const capped = Math.min(Math.max(num, 1), 10000);
    setRecordCount(capped);
  }}
  info="Generate 1-10,000 records with random data"
/>

// Update handleGenerate function (around line 90)
const handleGenerate = () => {
  if (fields.length === 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "No Fields",
      message: "Please add at least one field",
    });
    return;
  }

  // Show warning for large datasets
  if (recordCount > 100) {
    showToast({
      style: Toast.Style.Animated,
      title: "Generating...",
      message: `Creating ${recordCount} records with random data`,
    });
  }

  // Pass recordCount to generator
  const code = generateMockData(language, outputFormat, className, fields, recordCount);
  setGeneratedCode(code);
  setShowPreview(true);

  if (recordCount > 100) {
    showToast({
      style: Toast.Style.Success,
      title: "Generated!",
      message: `${recordCount} records created successfully`,
    });
  }
};
```

## 5. Update Generator Index

In `generators/index.ts`:

```typescript
import type { Field } from "../types";
import { generateJavaClass, generateJavaRecord, generateJavaBuilder } from "./java";
import { generatePythonDict, generatePythonDataclass, generatePydanticModel } from "./python";

// Update function signature to include count
export function generateMockData(
  language: string,
  outputFormat: string,
  className: string,
  fields: Field[],
  count: number = 1
): string {
  const key = `${language}-${outputFormat}`;
  const generator = GENERATOR_MAP[key];

  if (!generator) {
    return `// Generator not found for ${language} - ${outputFormat}`;
  }

  // Pass count to generator
  return generator(className, fields, count);
}

// Update GENERATOR_MAP type to include count parameter
const GENERATOR_MAP: Record<string, (className: string, fields: Field[], count?: number) => string> = {
  "Java-POJO Class": generateJavaClass,
  "Java-Record (Java 14+)": generateJavaRecord,
  "Java-Builder Pattern": generateJavaBuilder,
  "Python-Dictionary": generatePythonDict,
  "Python-Dataclass": generatePythonDataclass,
  "Python-Pydantic Model": generatePydanticModel,
};
```

## 6. Update Java Generators

In `generators/java.ts`:

```typescript
import type { Field } from "../types";
import { JAVA_TYPE_MAP } from "../constants/typeMapping";
import { generateRandomValue, formatValueForLanguage } from "../utils/randomData";

export function generateJavaClass(className: string, fields: Field[], count: number = 1): string {
  // Generate class definition
  const classDefinition = `public class ${className} {
${fields.map((field) => `    private ${JAVA_TYPE_MAP[field.type]} ${field.name};`).join("\n")}

    // Constructor
    public ${className}(${fields.map((f) => `${JAVA_TYPE_MAP[f.type]} ${f.name}`).join(", ")}) {
${fields.map((f) => `        this.${f.name} = ${f.name};`).join("\n")}
    }

    // Getters and Setters
${fields
  .map(
    (field) => `    public ${JAVA_TYPE_MAP[field.type]} get${field.name.charAt(0).toUpperCase() + field.name.slice(1)}() {
        return ${field.name};
    }

    public void set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(${JAVA_TYPE_MAP[field.type]} ${field.name}) {
        this.${field.name} = ${field.name};
    }`
  )
  .join("\n\n")}
}`;

  // If count is 1, return just the class
  if (count === 1) {
    return classDefinition;
  }

  // For multiple records, generate instances
  const imports = fields.some(f => f.type === 'date') 
    ? 'import java.time.LocalDateTime;\nimport java.util.Arrays;\nimport java.util.List;\n\n'
    : 'import java.util.Arrays;\nimport java.util.List;\n\n';

  const instances = Array.from({ length: count }, () => {
    const values = fields.map(f => {
      const randomValue = generateRandomValue(f.type, f.name);
      return formatValueForLanguage(randomValue, 'java', f.type);
    });
    return `    new ${className}(${values.join(", ")})`;
  });

  return `${imports}${classDefinition}

// Generated ${count} sample instances
List<${className}> ${className.toLowerCase()}List = Arrays.asList(
${instances.join(",\n")}
);`;
}

export function generateJavaRecord(className: string, fields: Field[], count: number = 1): string {
  const recordDefinition = `public record ${className}(
${fields.map((field) => `    ${JAVA_TYPE_MAP[field.type]} ${field.name}`).join(",\n")}
) {}`;

  if (count === 1) {
    return recordDefinition;
  }

  const imports = fields.some(f => f.type === 'date')
    ? 'import java.time.LocalDateTime;\nimport java.util.Arrays;\nimport java.util.List;\n\n'
    : 'import java.util.Arrays;\nimport java.util.List;\n\n';

  const instances = Array.from({ length: count }, () => {
    const values = fields.map(f => {
      const randomValue = generateRandomValue(f.type, f.name);
      return formatValueForLanguage(randomValue, 'java', f.type);
    });
    return `    new ${className}(${values.join(", ")})`;
  });

  return `${imports}${recordDefinition}

// Generated ${count} sample instances
List<${className}> ${className.toLowerCase()}List = Arrays.asList(
${instances.join(",\n")}
);`;
}

export function generateJavaBuilder(className: string, fields: Field[], count: number = 1): string {
  const builderClass = `public class ${className} {
${fields.map((field) => `    private ${JAVA_TYPE_MAP[field.type]} ${field.name};`).join("\n")}

    private ${className}() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ${className} instance = new ${className}();

${fields
  .map(
    (field) => `        public Builder ${field.name}(${JAVA_TYPE_MAP[field.type]} ${field.name}) {
            instance.${field.name} = ${field.name};
            return this;
        }`
  )
  .join("\n\n")}

        public ${className} build() {
            return instance;
        }
    }

    // Getters
${fields
  .map(
    (field) => `    public ${JAVA_TYPE_MAP[field.type]} get${field.name.charAt(0).toUpperCase() + field.name.slice(1)}() {
        return ${field.name};
    }`
  )
  .join("\n\n")}
}`;

  if (count === 1) {
    return builderClass;
  }

  const imports = fields.some(f => f.type === 'date')
    ? 'import java.time.LocalDateTime;\nimport java.util.Arrays;\nimport java.util.List;\n\n'
    : 'import java.util.Arrays;\nimport java.util.List;\n\n';

  const instances = Array.from({ length: count }, () => {
    const builderCalls = fields.map(f => {
      const randomValue = generateRandomValue(f.type, f.name);
      const formattedValue = formatValueForLanguage(randomValue, 'java', f.type);
      return `        .${f.name}(${formattedValue})`;
    });
    return `    ${className}.builder()\n${builderCalls.join("\n")}\n        .build()`;
  });

  return `${imports}${builderClass}

// Generated ${count} sample instances
List<${className}> ${className.toLowerCase()}List = Arrays.asList(
${instances.join(",\n")}
);`;
}
```

## 7. Update Python Generators

In `generators/python.ts`:

```typescript
import type { Field } from "../types";
import { PYTHON_TYPE_MAP } from "../constants/typeMapping";
import { generateRandomValue, formatValueForLanguage } from "../utils/randomData";

export function generatePythonDict(className: string, fields: Field[], count: number = 1): string {
  if (count === 1) {
    // Single dictionary
    return `${className.toLowerCase()} = {
${fields.map((field) => `    "${field.name}": ${formatSampleValue(field)}`).join(",\n")}
}`;
  }

  // Multiple dictionaries in a list
  const instances = Array.from({ length: count }, () => {
    const dictFields = fields.map(f => {
      const randomValue = generateRandomValue(f.type, f.name);
      const formattedValue = formatValueForLanguage(randomValue, 'python', f.type);
      return `        "${f.name}": ${formattedValue}`;
    });
    return `    {\n${dictFields.join(",\n")}\n    }`;
  });

  return `${className.toLowerCase()}_list = [\n${instances.join(",\n")}\n]`;
}

export function generatePythonDataclass(className: string, fields: Field[], count: number = 1): string {
  const dataclassDefinition = `from dataclasses import dataclass
${fields.some(f => f.type === 'date') ? 'from datetime import datetime\n' : ''}${fields.some(f => f.type === 'array') ? 'from typing import List\n' : ''}
@dataclass
class ${className}:
${fields.map((field) => `    ${field.name}: ${PYTHON_TYPE_MAP[field.type]}`).join("\n")}`;

  if (count === 1) {
    return dataclassDefinition;
  }

  const instances = Array.from({ length: count }, () => {
    const values = fields.map(f => {
      const randomValue = generateRandomValue(f.type, f.name);
      const formattedValue = formatValueForLanguage(randomValue, 'python', f.type);
      return `    ${f.name}=${formattedValue}`;
    });
    return `    ${className}(\n${values.join(",\n")}\n    )`;
  });

  return `${dataclassDefinition}

# Generated ${count} sample instances
${className.toLowerCase()}_list = [\n${instances.join(",\n")}\n]`;
}

export function generatePydanticModel(className: string, fields: Field[], count: number = 1): string {
  const modelDefinition = `from pydantic import BaseModel
${fields.some(f => f.type === 'date') ? 'from datetime import datetime\n' : ''}${fields.some(f => f.type === 'array') ? 'from typing import List\n' : ''}
class ${className}(BaseModel):
${fields.map((field) => `    ${field.name}: ${PYTHON_TYPE_MAP[field.type]}`).join("\n")}`;

  if (count === 1) {
    return modelDefinition;
  }

  const instances = Array.from({ length: count }, () => {
    const values = fields.map(f => {
      const randomValue = generateRandomValue(f.type, f.name);
      const formattedValue = formatValueForLanguage(randomValue, 'python', f.type);
      return `    ${f.name}=${formattedValue}`;
    });
    return `    ${className}(\n${values.join(",\n")}\n    )`;
  });

  return `${modelDefinition}

# Generated ${count} sample instances
${className.toLowerCase()}_list = [\n${instances.join(",\n")}\n]`;
}

function formatSampleValue(field: Field): string {
  // Keep existing implementation for single records
  const pythonValueMap: Record<string, string> = {
    string: '"sample"',
    integer: "0",
    boolean: "True",
    date: '"2024-01-01T00:00:00"',
    array: '["item1", "item2"]',
  };
  return pythonValueMap[field.type] || '"sample"';
}
```

## 8. Update Keyboard Shortcuts

In `src/generate-mock-data.tsx`, add a shortcut for the record count field:

```typescript
// In the ActionPanel, add:
<Action
  title="Focus Record Count"
  icon={Icon.Number}
  shortcut={{ modifiers: ["cmd"], key: "r" }}
  onAction={() => {
    // Focus on record count field
  }}
/>
```

## 9. Update README

Add to `README.md` features section:

```markdown
### 🎲 Bulk Generation with Realistic Data
- Generate 1-10,000 records at once
- Powered by Faker.js for realistic mock data
- Smart field detection (emails, names, dates, etc.)
- Contextually appropriate values based on field names
```

## 10. Testing

Test each combination:

```bash
# Run lint
npm run fix-lint

# Build
npm run build

# Test in Raycast
npm run dev
```

Test scenarios:
- Single record (count = 1)
- Small batch (count = 10)
- Medium batch (count = 100)
- Large batch (count = 1000)
- Each language (Java, Python)
- Each output format (POJO, Record, Builder, Dict, Dataclass, Pydantic)

## Notes

- The 10,000 record cap prevents browser freezing
- Faker.js adds ~500KB to bundle size (acceptable for this feature)
- Smart field detection works for common field names
- Large datasets show progress toasts for better UX
- Arrays generate 2-5 random items by default
