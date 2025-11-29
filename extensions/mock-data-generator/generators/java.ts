import { Field } from "../types";
import { JAVA_TYPE_MAP } from "../constants/typeMapping";
import { generateRandomValue, formatValueForLanguage } from "../utils/randomData";

export function generateJavaClass(className: string, fields: Field[], count: number = 1): string {
  const fieldDeclarations = fields.map((f) => `    private ${JAVA_TYPE_MAP[f.type]} ${f.name};`).join("\n");

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

  const classDefinition = `public class ${className} {
${fieldDeclarations}

    public ${className}() {
    }
${getters}
${setters}
}`;

  if (count === 1) {
    return classDefinition;
  }

  // Generate multiple instances with random data
  const imports = buildJavaImports(fields);
  const instances = generateJavaInstances(className, fields, count, "constructor");

  return `${imports}${classDefinition}

// Generated ${count} sample instances
List<${className}> ${camelCase(className)}List = Arrays.asList(
${instances}
);`;
}

export function generateJavaRecord(recordName: string, fields: Field[], count: number = 1): string {
  const params = fields.map((f) => `${JAVA_TYPE_MAP[f.type]} ${f.name}`).join(", ");

  const recordDefinition = `public record ${recordName}(${params}) {}`;

  if (count === 1) {
    return recordDefinition;
  }

  const imports = buildJavaImports(fields);
  const instances = generateJavaInstances(recordName, fields, count, "constructor");

  return `${imports}${recordDefinition}

// Generated ${count} sample instances
List<${recordName}> ${camelCase(recordName)}List = Arrays.asList(
${instances}
);`;
}

export function generateJavaBuilder(className: string, fields: Field[], count: number = 1): string {
  const fieldDeclarations = fields.map((f) => `    private ${JAVA_TYPE_MAP[f.type]} ${f.name};`).join("\n");

  const builderMethods = fields
    .map((f) => {
      const type = JAVA_TYPE_MAP[f.type];
      const methodName = f.name;
      return `
        public Builder ${methodName}(${type} ${methodName}) {
            this.${methodName} = ${methodName};
            return this;
        }`;
    })
    .join("\n");

  const constructorParams = fields.map((f) => `${JAVA_TYPE_MAP[f.type]} ${f.name}`).join(", ");

  const constructorAssignments = fields.map((f) => `        this.${f.name} = ${f.name};`).join("\n");

  const builderFields = fields.map((f) => `        private ${JAVA_TYPE_MAP[f.type]} ${f.name};`).join("\n");

  const builderClass = `public class ${className} {
${fieldDeclarations}

    private ${className}(${constructorParams}) {
${constructorAssignments}
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
${builderFields}

${builderMethods}

        public ${className} build() {
            return new ${className}(${fields.map((f) => f.name).join(", ")});
        }
    }
}`;

  if (count === 1) {
    return builderClass;
  }

  const imports = buildJavaImports(fields);
  const instances = generateJavaInstances(className, fields, count, "builder");

  return `${imports}${builderClass}

// Generated ${count} sample instances
List<${className}> ${camelCase(className)}List = Arrays.asList(
${instances}
);`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function buildJavaImports(fields: Field[]): string {
  const imports = ["import java.util.Arrays;", "import java.util.List;"];

  if (fields.some((f) => f.type === "date")) {
    imports.push("import java.time.LocalDateTime;");
  }

  return imports.join("\n") + "\n\n";
}

function generateJavaInstances(
  className: string,
  fields: Field[],
  count: number,
  style: "constructor" | "builder"
): string {
  const instances = Array.from({ length: count }, () => {
    if (style === "builder") {
      const builderCalls = fields.map((f) => {
        const randomValue = generateRandomValue(f.type, f.name);
        const formattedValue = formatValueForLanguage(randomValue, "java", f.type);
        return `        .${f.name}(${formattedValue})`;
      });
      return `    ${className}.builder()\n${builderCalls.join("\n")}\n        .build()`;
    } else {
      const values = fields.map((f) => {
        const randomValue = generateRandomValue(f.type, f.name);
        return formatValueForLanguage(randomValue, "java", f.type);
      });
      return `    new ${className}(${values.join(", ")})`;
    }
  });

  return instances.join(",\n");
}