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

export function generateJavaBuilder(className: string, fields: Field[]): string {
  const fieldDeclarations = fields
    .map((f) => `    private ${JAVA_TYPE_MAP[f.type]} ${f.name};`)
    .join("\n");

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

  const constructorParams = fields
    .map((f) => `${JAVA_TYPE_MAP[f.type]} ${f.name}`)
    .join(", ");

  const constructorAssignments = fields
    .map((f) => `        this.${f.name} = ${f.name};`)
    .join("\n");

  const builderFields = fields
    .map((f) => `        private ${JAVA_TYPE_MAP[f.type]} ${f.name};`)
    .join("\n");

  return `public class ${className} {
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
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}