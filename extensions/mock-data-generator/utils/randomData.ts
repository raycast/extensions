import { faker } from "@faker-js/faker";
import type { FieldType, LanguageId } from "../types";

type RandomValue = string | number | boolean | string[];

/**
 * generates a random value based on field type and name
 * uses smart detection to generate contextually appropriate data
 */
export function generateRandomValue(fieldType: FieldType, fieldName: string): RandomValue {
  const lowerName = fieldName.toLowerCase();

  switch (fieldType) {
    case "string":
      return generateStringValue(lowerName);
    case "integer":
      return generateIntegerValue(lowerName);
    case "boolean":
      return generateBooleanValue(lowerName);
    case "date":
      return generateDateValue(lowerName);
    case "array":
      return generateArrayValue(lowerName);
    default:
      return faker.lorem.word();
  }
}

function generateStringValue(lowerName: string): string {
  if (lowerName.includes("email")) {
    return faker.internet.email();
  }
  if (lowerName.includes("username") || lowerName === "user") {
    return faker.internet.username();
  }
  if (lowerName.includes("firstname") || lowerName === "fname") {
    return faker.person.firstName();
  }
  if (lowerName.includes("lastname") || lowerName === "lname") {
    return faker.person.lastName();
  }
  if (lowerName.includes("name")) {
    return faker.person.fullName();
  }
  if (lowerName.includes("title")) {
    return faker.lorem.sentence(3);
  }
  if (lowerName.includes("description") || lowerName.includes("content")) {
    return faker.lorem.paragraph();
  }
  if (lowerName.includes("address")) {
    return faker.location.streetAddress();
  }
  if (lowerName.includes("city")) {
    return faker.location.city();
  }
  if (lowerName.includes("country")) {
    return faker.location.country();
  }
  if (lowerName.includes("phone")) {
    return faker.phone.number();
  }
  if (lowerName.includes("company")) {
    return faker.company.name();
  }
  if (lowerName.includes("url") || lowerName.includes("website")) {
    return faker.internet.url();
  }
  if (lowerName.includes("color")) {
    return faker.color.human();
  }
  return faker.lorem.word();
}

function generateIntegerValue(lowerName: string): number {
  if (lowerName.includes("age")) {
    return faker.number.int({ min: 18, max: 80 });
  }
  if (lowerName.includes("year")) {
    return faker.number.int({ min: 1900, max: 2025 });
  }
  if (lowerName.includes("price") || lowerName.includes("cost")) {
    return faker.number.int({ min: 10, max: 1000 });
  }
  if (lowerName.includes("quantity") || lowerName.includes("count")) {
    return faker.number.int({ min: 1, max: 100 });
  }
  if (lowerName.includes("id")) {
    return faker.number.int({ min: 1, max: 10000 });
  }
  return faker.number.int({ min: 1, max: 1000 });
}

function generateBooleanValue(lowerName: string): boolean {
  if (lowerName.includes("active") || lowerName.includes("enabled")) {
    return faker.datatype.boolean({ probability: 0.8 });
  }
  if (lowerName.includes("verified") || lowerName.includes("confirmed")) {
    return faker.datatype.boolean({ probability: 0.7 });
  }
  return faker.datatype.boolean();
}

function generateDateValue(lowerName: string): string {
  if (lowerName.includes("birth") || lowerName.includes("dob")) {
    return faker.date.birthdate({ min: 18, max: 80, mode: "age" }).toISOString();
  }
  if (lowerName.includes("created")) {
    return faker.date.past({ years: 2 }).toISOString();
  }
  if (lowerName.includes("updated") || lowerName.includes("modified")) {
    return faker.date.recent({ days: 30 }).toISOString();
  }
  if (lowerName.includes("published")) {
    return faker.date.past({ years: 1 }).toISOString();
  }
  return faker.date.past().toISOString();
}

function generateArrayValue(lowerName: string): string[] {
  if (lowerName.includes("tags") || lowerName.includes("categories")) {
    return Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => faker.lorem.word());
  }
  if (lowerName.includes("email")) {
    return Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.internet.email());
  }
  return Array.from({ length: 3 }, () => faker.lorem.word());
}

/**
 * format value according to the target language
 */
export function formatValueForLanguage(value: RandomValue, language: LanguageId, fieldType: FieldType): string {
  switch (language) {
    case "java":
      return formatValueForJava(value, fieldType);
    case "python":
      return formatValueForPython(value, fieldType);
    case "javascript":
      return formatValueForJavaScript(value, fieldType);
    case "typescript":
      return formatValueForTypeScript(value, fieldType);
  }
}

function formatValueForJava(value: RandomValue, fieldType: FieldType): string {
  switch (fieldType) {
    case "string":
      return `"${value}"`;
    case "integer":
      return value.toString();
    case "boolean":
      return value ? "true" : "false";
    case "date":
      return `LocalDateTime.parse("${value}")`;
    case "array": {
      const items = Array.isArray(value) ? value : [value];
      const formattedItems = items.map((v) => `"${v}"`).join(", ");
      return `Arrays.asList(${formattedItems})`;
    }
    default:
      return `"${value}"`;
  }
}

function formatValueForPython(value: RandomValue, fieldType: FieldType): string {
  switch (fieldType) {
    case "string":
      return `"${value}"`;
    case "integer":
      return value.toString();
    case "boolean":
      return value ? "True" : "False";
    case "date":
      return `"${value}"`;
    case "array": {
      const items = Array.isArray(value) ? value : [value];
      const formattedItems = items.map((v) => `"${v}"`).join(", ");
      return `[${formattedItems}]`;
    }
    default:
      return `"${value}"`;
  }
}

function formatValueForTypeScript(value: RandomValue, fieldType: FieldType): string {
  switch (fieldType) {
    case "string":
      return `"${value}"`;
    case "integer":
      return value.toString();
    case "boolean":
      return value ? "true" : "false";
    case "date":
      return `new Date("${value}")`;
    case "array": {
      const items = Array.isArray(value) ? value : [value];
      const formattedItems = items.map((v) => `"${v}"`).join(", ");
      return `[${formattedItems}]`;
    }
    default:
      return `"${value}"`;
  }
}

function formatValueForJavaScript(value: RandomValue, fieldType: FieldType): string {
  // Same as TypeScript for most cases
  return formatValueForTypeScript(value, fieldType);
}
