import { Field } from "../types";
import { generateRandomValue, formatValueForLanguage } from "../utils/randomData";

export function generateJSObject(
  objectName: string, 
  fields: Field[], 
  count: number = 1
): string {
  if (count === 1) {
    const fieldValues = fields
      .map((f) => `  ${f.name}: null, // TODO: Set value`)
      .join("\n");
    
    return `const ${camelCase(objectName)} = {\n${fieldValues}\n};`;
  }

  // Generate array of objects with random data
  const instances = generateJSInstances(objectName, fields, count);
  
  return `// Generated ${count} sample instances\nconst ${camelCase(objectName)}List = [\n${instances}\n];`;
}

export function generateJSClass(
  className: string, 
  fields: Field[], 
  count: number = 1
): string {
  const constructorParams = fields.map((f) => f.name).join(", ");

  const constructorAssignments = fields
    .map((f) => `    this.${f.name} = ${f.name};`)
    .join("\n");

  const classDefinition = `class ${className} {\n  constructor(${constructorParams}) {\n${constructorAssignments}\n  }\n}`;

  if (count === 1) {
    return classDefinition;
  }

  const instances = generateJSInstances(className, fields, count, true);
  
  return `${classDefinition}\n\n// Generated ${count} sample instances\nconst ${camelCase(className)}List = [\n${instances}\n];`;
}

function generateJSInstances(
  name: string, 
  fields: Field[], 
  count: number, 
  isClass: boolean = false
): string {
  const instances = Array.from({ length: count }, () => {
    if (isClass) {
      const values = fields.map((f) => {
        const randomValue = generateRandomValue(f.type, f.name);
        return formatValueForLanguage(randomValue, "javascript", f.type);
      });
      return `  new ${name}(${values.join(", ")})`;
    } else {
      const fieldValues = fields.map((f) => {
        const randomValue = generateRandomValue(f.type, f.name);
        const formattedValue = formatValueForLanguage(randomValue, "javascript", f.type);
        return `    ${f.name}: ${formattedValue}`;
      });
      return `  {\n${fieldValues.join(",\n")}\n  }`;
    }
  });

  return instances.join(",\n");
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}