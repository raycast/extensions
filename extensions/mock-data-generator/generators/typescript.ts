import { Field } from "../types";
import { TS_TYPE_MAP } from "../constants/typeMapping";
import { generateRandomValue, formatValueForLanguage } from "../utils/randomData";

export function generateTSInterface(interfaceName: string, fields: Field[], count: number = 1): string {
  const fieldDeclarations = fields.map((f) => ` ${f.name}: ${TS_TYPE_MAP[f.type]}`).join("\n");
  const interfaceDefinition = `interface ${interfaceName} {\n${fieldDeclarations}\n}`;

  if (count === 1) {
    return interfaceDefinition;
  }

  const instances = generateTSInstances(interfaceName, fields, count);

  return `${interfaceDefinition}\n\n// Generated ${count} sample instances\nconst ${camelCase(interfaceName)}List: ${interfaceName}[] = [\n${instances}\n];`;
}

export function generateTSType(typeName: string, fields: Field[], count: number = 1): string {
  const fieldDeclarations = fields.map((f) => ` ${f.name}: ${TS_TYPE_MAP[f.type]};`).join("\n");
  const typeDefinition = `type ${typeName} = {\n${fieldDeclarations}\n};`;

  if (count === 1) {
    return typeDefinition;
  }

  const instances = generateTSInstances(typeName, fields, count);

  return `${typeDefinition}\n\n// Generated ${count} sample instances\nconst ${camelCase(typeName)}List: ${typeName}[] = [\n${instances}\n];`;
}

export function generateTSClass(
  className: string, 
  fields: Field[], 
  count: number = 1
): string {
  const properties = fields
    .map((f) => `  ${f.name}: ${TS_TYPE_MAP[f.type]};`)
    .join("\n");

  const constructorParams = fields
    .map((f) => `${f.name}: ${TS_TYPE_MAP[f.type]}`)
    .join(", ");

  const constructorAssignments = fields
    .map((f) => `    this.${f.name} = ${f.name};`)
    .join("\n");

  const classDefinition = `class ${className} {\n${properties}\n\n  constructor(${constructorParams}) {\n${constructorAssignments}\n  }\n}`;

  if (count === 1) {
    return classDefinition;
  }

  const instances = generateTSInstances(className, fields, count);
  
  return `${classDefinition}\n\n// Generated ${count} sample instances\nconst ${camelCase(className)}List: ${className}[] = [\n${instances}\n];`;
}

export function generateZodSchema(
  schemaName: string, 
  fields: Field[], 
  count: number = 1
): string {
  const zodTypes: Record<string, string> = {
    string: "z.string()",
    integer: "z.number().int()",
    boolean: "z.boolean()",
    date: "z.date()",
    array: "z.array(z.string())",
  };

  const fieldSchemas = fields
    .map((f) => `  ${f.name}: ${zodTypes[f.type]},`)
    .join("\n");

  const schemaDefinition = `import { z } from "zod";\n\nconst ${schemaName}Schema = z.object({\n${fieldSchemas}\n});\n\ntype ${schemaName} = z.infer<typeof ${schemaName}Schema>;`;

  if (count === 1) {
    return schemaDefinition;
  }

  const instances = generateTSInstances(schemaName, fields, count);
  
  return `${schemaDefinition}\n\n// Generated ${count} sample instances\nconst ${camelCase(schemaName)}List: ${schemaName}[] = [\n${instances}\n];`;
}

function generateTSInstances(
  typeName: string, 
  fields: Field[], 
  count: number
): string {
  const instances = Array.from({ length: count }, () => {
    const fieldValues = fields.map((f) => {
      const randomValue = generateRandomValue(f.type, f.name);
      const formattedValue = formatValueForLanguage(randomValue, "typescript", f.type);
      return `    ${f.name}: ${formattedValue}`;
    });
    return `  {\n${fieldValues.join(",\n")}\n  }`;
  });

  return instances.join(",\n");
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}