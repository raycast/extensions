import { cloneTemplate } from "./domain";
import {
  getRemoteConfigTemplate,
  updateRemoteConfigTemplate,
} from "./remote-config-client";
import type {
  BulkOperation,
  PreparedBulkResult,
  ProjectConfig,
  PublishedBulkResult,
  RemoteConfigCondition,
  RemoteConfigParameter,
  RemoteConfigTemplate,
  RemoteConfigValue,
} from "./types";

function sortConditions(
  conditions: RemoteConfigCondition[],
): RemoteConfigCondition[] {
  return [...conditions].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function sortConditionalValues(
  values: Record<string, RemoteConfigValue>,
): Record<string, RemoteConfigValue> {
  return Object.fromEntries(
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeTemplate(
  template: RemoteConfigTemplate,
): RemoteConfigTemplate {
  const nextTemplate = cloneTemplate(template);
  nextTemplate.parameters = Object.fromEntries(
    Object.entries(nextTemplate.parameters ?? {}).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  for (const parameter of Object.values(nextTemplate.parameters ?? {})) {
    if (parameter.conditionalValues) {
      parameter.conditionalValues = sortConditionalValues(
        parameter.conditionalValues,
      );
    }
  }

  return nextTemplate;
}

function ensureParameters(
  template: RemoteConfigTemplate,
): Record<string, RemoteConfigParameter> {
  template.parameters ??= {};
  return template.parameters;
}

function ensureConditions(
  template: RemoteConfigTemplate,
): RemoteConfigCondition[] {
  template.conditions ??= [];
  return template.conditions;
}

function isConditionReferenced(
  template: RemoteConfigTemplate,
  conditionName: string,
): boolean {
  return Object.values(template.parameters ?? {}).some((parameter) =>
    Boolean(parameter.conditionalValues?.[conditionName]),
  );
}

function compareJson(
  left: RemoteConfigTemplate,
  right: RemoteConfigTemplate,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyOperation(
  template: RemoteConfigTemplate,
  operation: BulkOperation,
): { template: RemoteConfigTemplate; changes: string[] } {
  const working = normalizeTemplate(template);
  const changes: string[] = [];

  switch (operation.type) {
    case "upsert-parameter": {
      const parameters = ensureParameters(working);
      const current = parameters[operation.key];
      parameters[operation.key] = {
        defaultValue: { value: operation.rawValue },
        conditionalValues: current?.conditionalValues ?? {},
        description: operation.description ?? current?.description,
        valueType: operation.firebaseValueType,
      };
      changes.push(
        current
          ? `Updated parameter ${operation.key}`
          : `Created parameter ${operation.key}`,
      );
      break;
    }
    case "delete-parameter": {
      const parameters = ensureParameters(working);
      if (!parameters[operation.key]) {
        throw new Error(`Parameter ${operation.key} does not exist.`);
      }
      delete parameters[operation.key];
      changes.push(`Deleted parameter ${operation.key}`);
      break;
    }
    case "set-conditional-value": {
      const parameters = ensureParameters(working);
      const current = parameters[operation.key] ?? {
        defaultValue: { value: "" },
        valueType: operation.firebaseValueType ?? "STRING",
      };
      current.conditionalValues ??= {};
      current.valueType =
        operation.firebaseValueType ?? current.valueType ?? "STRING";
      current.description = operation.description ?? current.description;
      current.conditionalValues[operation.conditionName] = {
        value: operation.rawValue,
      };
      parameters[operation.key] = current;
      changes.push(
        `Set conditional value ${operation.key} -> ${operation.conditionName}`,
      );
      break;
    }
    case "remove-conditional-value": {
      const parameter = working.parameters?.[operation.key];
      if (!parameter?.conditionalValues?.[operation.conditionName]) {
        throw new Error(
          `Override ${operation.conditionName} does not exist in ${operation.key}.`,
        );
      }
      delete parameter.conditionalValues[operation.conditionName];
      changes.push(
        `Removed conditional value ${operation.key} -> ${operation.conditionName}`,
      );
      break;
    }
    case "clone-parameter": {
      const parameters = ensureParameters(working);
      const source = parameters[operation.sourceKey];
      if (!source) {
        throw new Error(
          `Source parameter ${operation.sourceKey} does not exist.`,
        );
      }
      parameters[operation.targetKey] = JSON.parse(
        JSON.stringify(source),
      ) as RemoteConfigParameter;
      changes.push(
        `Cloned parameter ${operation.sourceKey} to ${operation.targetKey}`,
      );
      if (operation.deleteSource) {
        delete parameters[operation.sourceKey];
        changes.push(`Deleted source parameter ${operation.sourceKey}`);
      }
      break;
    }
    case "upsert-condition": {
      const conditions = ensureConditions(working);
      const existing = conditions.find(
        (condition) => condition.name === operation.name,
      );
      if (existing) {
        existing.expression = operation.expression;
        existing.tagColor = operation.tagColor || existing.tagColor;
        changes.push(`Updated condition ${operation.name}`);
      } else {
        conditions.push({
          name: operation.name,
          expression: operation.expression,
          tagColor: operation.tagColor || undefined,
        });
        working.conditions = sortConditions(conditions);
        changes.push(`Created condition ${operation.name}`);
      }
      break;
    }
    case "delete-condition": {
      if (isConditionReferenced(working, operation.name)) {
        throw new Error(
          `Condition ${operation.name} is still referenced by parameters.`,
        );
      }
      const nextConditions = (working.conditions ?? []).filter(
        (condition) => condition.name !== operation.name,
      );
      if (nextConditions.length === (working.conditions ?? []).length) {
        throw new Error(`Condition ${operation.name} does not exist.`);
      }
      working.conditions = nextConditions;
      changes.push(`Deleted condition ${operation.name}`);
      break;
    }
  }

  return { template: normalizeTemplate(working), changes };
}

export async function prepareBulkOperation(
  projects: ProjectConfig[],
  operation: BulkOperation,
): Promise<PreparedBulkResult[]> {
  return Promise.all(
    projects.map(async (project) => {
      try {
        const { template, etag } = await getRemoteConfigTemplate(project);
        const { template: updatedTemplate, changes } = applyOperation(
          template,
          operation,
        );
        if (compareJson(normalizeTemplate(template), updatedTemplate)) {
          return {
            project,
            status: "no-op",
            changes: [],
            originalTemplate: template,
            updatedTemplate,
            etag,
          } satisfies PreparedBulkResult;
        }

        return {
          project,
          status: "preview",
          changes,
          originalTemplate: template,
          updatedTemplate,
          etag,
        } satisfies PreparedBulkResult;
      } catch (error) {
        return {
          project,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
          changes: [],
        } satisfies PreparedBulkResult;
      }
    }),
  );
}

export async function publishPreparedBulkOperation(
  prepared: PreparedBulkResult[],
): Promise<PublishedBulkResult[]> {
  return Promise.all(
    prepared.map(async (result) => {
      if (result.status === "error") {
        return {
          project: result.project,
          status: "error",
          changes: [],
          error: result.error,
        } satisfies PublishedBulkResult;
      }
      if (
        result.status === "no-op" ||
        !result.updatedTemplate ||
        !result.etag
      ) {
        return {
          project: result.project,
          status: "no-op",
          changes: [],
        } satisfies PublishedBulkResult;
      }

      try {
        await updateRemoteConfigTemplate(
          result.project,
          result.updatedTemplate,
          result.etag,
        );
        return {
          project: result.project,
          status: "success",
          changes: result.changes,
        } satisfies PublishedBulkResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          project: result.project,
          status: /etag|If-Match|409|FAILED_PRECONDITION/i.test(message)
            ? "conflict"
            : "error",
          changes: result.changes,
          error: message,
        } satisfies PublishedBulkResult;
      }
    }),
  );
}
