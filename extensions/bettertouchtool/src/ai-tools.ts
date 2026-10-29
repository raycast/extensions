import { actions, type ActionJson, type TriggerJson } from "bettertouchtool";
import { actionCatalog, type ActionDefinition } from "bettertouchtool/catalog";
import { getParameterFields } from "./action-parameters";
import { isTriggerEnabled } from "./trigger-utils";

export type ToolResult<T extends object> = ({ success: true } & T) | { success: false; error: string };

export interface NamedTriggerSearchInput {
  query?: string;
  status?: "all" | "enabled" | "disabled";
  limit?: number;
}

export interface NamedTriggerSearchResult {
  uuid: string;
  name: string;
  enabled: boolean;
  group?: string;
  actions: string[];
}

export interface ActionSearchInput {
  query: string;
  limit?: number;
}

export interface ActionSearchResult {
  id: number;
  name: string;
  category: string;
  description: string;
  parameters: Array<{
    name: string;
    description: string;
    type: "boolean" | "json" | "number" | "text";
    example?: unknown;
  }>;
}

export interface RunActionInput {
  id: number;
  parameters?: Record<string, unknown>;
}

export interface ActionParameterInput {
  name: string;
  value: string;
}

export interface SetVariableInput {
  variableName: string;
  variableValue: string;
  variableType: "string" | "number";
  persistent?: boolean;
}

interface NamedTrigger extends TriggerJson {
  BTTGestureNotes?: string;
  BTTTriggerName?: string;
  BTTTriggerParentUUID?: string;
}

interface TriggerGroup extends TriggerJson {
  BTTGroupName?: string;
  BTTTriggerParentUUID?: string;
}

export interface BttAiClient {
  getTriggers<T extends TriggerJson = TriggerJson>(filter?: { triggerId?: number }): Promise<T[]>;
  getTrigger<T extends TriggerJson = TriggerJson>(uuid: string): Promise<T>;
  trigger(uuid: string): { invoke(): Promise<string> };
  triggerAction(action: ActionJson | ActionJson[]): Promise<string>;
  getVariableType(name: string): Promise<string>;
  vars: {
    get(name: string): Promise<string | number>;
    set(name: string, value: string | number, options?: { persistent?: boolean }): Promise<void>;
  };
}

export async function searchNamedTriggers(
  btt: BttAiClient,
  input: NamedTriggerSearchInput,
): Promise<ToolResult<{ triggers: NamedTriggerSearchResult[] }>> {
  try {
    const triggers = await btt.getTriggers<NamedTrigger>({ triggerId: 643 });
    let groups: TriggerGroup[] = [];
    try {
      groups = await btt.getTriggers<TriggerGroup>({ triggerId: 630 });
    } catch {
      // Group metadata is useful but not required to find or run a named trigger.
    }

    const groupNames = getGroupPaths(groups);
    const status = input.status ?? "all";
    const matches = triggers
      .filter((trigger) => Boolean(trigger.BTTUUID && trigger.BTTTriggerName))
      .map((trigger) => {
        const enabled = isTriggerEnabled(trigger);
        const group = trigger.BTTTriggerParentUUID ? groupNames.get(trigger.BTTTriggerParentUUID) : undefined;
        const actionNames = getTriggerActionNames(trigger);
        const score = rankQuery(input.query, [trigger.BTTTriggerName ?? "", group ?? "", ...actionNames]);
        return { trigger, enabled, group, actionNames, score };
      })
      .filter(({ enabled, score }) => {
        const hasRequestedStatus = status === "all" || enabled === (status === "enabled");
        return hasRequestedStatus && score !== undefined;
      })
      .sort((left, right) => {
        const scoreDifference = (left.score ?? 0) - (right.score ?? 0);
        return scoreDifference || (left.trigger.BTTTriggerName ?? "").localeCompare(right.trigger.BTTTriggerName ?? "");
      })
      .slice(0, normalizeLimit(input.limit))
      .map(({ trigger, enabled, group, actionNames }): NamedTriggerSearchResult => ({
        uuid: trigger.BTTUUID as string,
        name: trigger.BTTTriggerName as string,
        enabled,
        ...(group ? { group } : {}),
        actions: actionNames,
      }));

    return { success: true, triggers: matches };
  } catch (error) {
    return failure(error);
  }
}

export async function runNamedTrigger(
  btt: BttAiClient,
  uuid: string,
): Promise<ToolResult<{ trigger: { uuid: string; name: string }; result?: string }>> {
  try {
    const trigger = await btt.getTrigger<NamedTrigger>(uuid);
    const name = trigger.BTTTriggerName;
    if (!trigger.BTTUUID || !name) return { success: false, error: `No named trigger exists with UUID ${uuid}.` };
    if (!isTriggerEnabled(trigger)) return { success: false, error: `The named trigger “${name}” is disabled.` };

    const result = await btt.trigger(trigger.BTTUUID).invoke();
    return {
      success: true,
      trigger: { uuid: trigger.BTTUUID, name },
      ...(result ? { result } : {}),
    };
  } catch (error) {
    return failure(error);
  }
}

export function searchActions(
  input: ActionSearchInput,
  catalog: readonly ActionDefinition[] = actionCatalog.all,
): ToolResult<{ actions: ActionSearchResult[] }> {
  const query = input.query.trim();
  if (!query) return { success: false, error: "Enter an action name, category, description, slug, or numeric ID." };

  const matches = catalog
    .map((definition) => ({
      definition,
      score: rankQuery(query, [
        String(definition.id),
        definition.name,
        definition.slug,
        definition.category,
        definition.description,
      ]),
    }))
    .filter((match): match is { definition: ActionDefinition; score: number } => match.score !== undefined)
    .sort((left, right) => left.score - right.score || left.definition.name.localeCompare(right.definition.name))
    .slice(0, normalizeLimit(input.limit))
    .map(({ definition }): ActionSearchResult => ({
      id: definition.id,
      name: definition.name,
      category: definition.category,
      description: definition.description,
      parameters: getParameterFields(definition).map(({ definition: parameter, initialValue, kind }) => ({
        name: parameter.key,
        description: parameter.description,
        type: kind === "raw-json" ? "json" : kind,
        ...(initialValue === undefined ? {} : { example: initialValue }),
      })),
    }));

  return { success: true, actions: matches };
}

export function parseActionParameterInputs(
  id: number,
  parameters: ActionParameterInput[],
  catalog: readonly ActionDefinition[] = actionCatalog.all,
): ToolResult<{ parameters: Record<string, unknown> }> {
  const definition = catalog.find((action) => action.id === id);
  if (!definition) return { success: false, error: `No BetterTouchTool action exists with ID ${id}.` };

  const fields = new Map(getParameterFields(definition).map((field) => [field.definition.key, field]));
  const result: Record<string, unknown> = {};
  for (const parameter of parameters) {
    const field = fields.get(parameter.name);
    if (!field)
      return {
        success: false,
        error: `“${parameter.name}” is not a supported parameter for the “${definition.name}” action.`,
      };
    if (parameter.name in result) return { success: false, error: `“${parameter.name}” was provided more than once.` };

    if (field.kind === "text") {
      result[parameter.name] = parameter.value;
      continue;
    }
    if (field.kind === "number") {
      const value = Number(parameter.value);
      if (parameter.value.trim() === "" || !Number.isFinite(value)) {
        return { success: false, error: `“${parameter.name}” must be a finite number.` };
      }
      result[parameter.name] = value;
      continue;
    }
    if (field.kind === "boolean") {
      if (parameter.value !== "true" && parameter.value !== "false") {
        return { success: false, error: `“${parameter.name}” must be either “true” or “false”.` };
      }
      result[parameter.name] = parameter.value === "true";
      continue;
    }

    try {
      result[parameter.name] = JSON.parse(parameter.value) as unknown;
    } catch {
      return { success: false, error: `“${parameter.name}” must be valid JSON.` };
    }
  }

  return { success: true, parameters: result };
}

export async function runAction(
  btt: BttAiClient,
  input: RunActionInput,
  catalog: readonly ActionDefinition[] = actionCatalog.all,
): Promise<ToolResult<{ action: { id: number; name: string }; result?: string }>> {
  const definition = catalog.find((action) => action.id === input.id);
  if (!definition) return { success: false, error: `No BetterTouchTool action exists with ID ${input.id}.` };

  const parameterError = validateActionParameters(definition, input.parameters ?? {});
  if (parameterError) return { success: false, error: parameterError };

  try {
    const result = await btt.triggerAction(actions.action(definition.id, input.parameters));
    return {
      success: true,
      action: { id: definition.id, name: definition.name },
      ...(result ? { result } : {}),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function getVariable(
  btt: BttAiClient,
  variableName: string,
): Promise<
  ToolResult<{ variable: { name: string; value: string | number; type: "string" | "number"; isSet: boolean } }>
> {
  if (!variableName) return { success: false, error: "A variable name is required." };

  try {
    const [value, declaredType] = await Promise.all([btt.vars.get(variableName), btt.getVariableType(variableName)]);
    const type = declaredType.toLowerCase() === "number" || typeof value === "number" ? "number" : "string";
    return {
      success: true,
      variable: {
        name: variableName,
        value,
        type,
        isSet: Boolean(declaredType) || value !== "",
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function setVariable(
  btt: BttAiClient,
  input: SetVariableInput,
): Promise<
  ToolResult<{ variable: { name: string; value: string | number; type: "string" | "number"; persistent: boolean } }>
> {
  if (!input.variableName) return { success: false, error: "A variable name is required." };

  const parsedValue = parseVariableValue(input.variableValue, input.variableType);
  if (!parsedValue.success) return parsedValue;

  try {
    const persistent = input.persistent ?? false;
    await btt.vars.set(input.variableName, parsedValue.value, { persistent });
    return {
      success: true,
      variable: {
        name: input.variableName,
        value: parsedValue.value,
        type: input.variableType,
        persistent,
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export function parseVariableValue(
  value: string,
  type: "string" | "number",
): { success: true; value: string | number } | { success: false; error: string } {
  if (type === "string") return { success: true, value };
  if (value.trim() === "") return { success: false, error: "A numeric variable cannot have an empty value." };

  const number = Number(value);
  return Number.isFinite(number)
    ? { success: true, value: number }
    : { success: false, error: `“${value}” is not a valid finite number.` };
}

function getGroupPaths(groups: TriggerGroup[]): Map<string, string> {
  const groupsByUuid = new Map(
    groups.filter((group) => group.BTTUUID).map((group) => [group.BTTUUID as string, group]),
  );
  const paths = new Map<string, string>();

  function getPath(uuid: string, visited = new Set<string>()): string | undefined {
    if (paths.has(uuid)) return paths.get(uuid);
    const group = groupsByUuid.get(uuid);
    if (!group?.BTTGroupName || visited.has(uuid)) return group?.BTTGroupName;

    visited.add(uuid);
    const parent = group.BTTTriggerParentUUID ? getPath(group.BTTTriggerParentUUID, visited) : undefined;
    const path = parent ? `${parent} › ${group.BTTGroupName}` : group.BTTGroupName;
    paths.set(uuid, path);
    return path;
  }

  for (const uuid of groupsByUuid.keys()) getPath(uuid);
  return paths;
}

function getTriggerActionNames(trigger: NamedTrigger): string[] {
  const nestedActions = [...(trigger.BTTActionsToExecute ?? []), ...(trigger.BTTAdditionalActions ?? [])];
  const names = [trigger.BTTPredefinedActionName, ...nestedActions.map((action) => action.BTTPredefinedActionName)];
  return names.filter((name): name is string => Boolean(name));
}

function validateActionParameters(
  definition: ActionDefinition,
  parameters: Record<string, unknown>,
): string | undefined {
  const fields = new Map(getParameterFields(definition).map((field) => [field.definition.key, field]));

  for (const [name, value] of Object.entries(parameters)) {
    const field = fields.get(name);
    if (!field) return `“${name}” is not a supported parameter for the “${definition.name}” action.`;
    if (value === undefined || !isJsonValue(value)) return `“${name}” must be a JSON-compatible value.`;
    if (field.kind === "boolean" && typeof value !== "boolean") return `“${name}” must be a boolean.`;
    if (field.kind === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
      return `“${name}” must be a finite number.`;
    }
    if (field.kind === "text" && typeof value !== "string") return `“${name}” must be text.`;
    if (field.kind === "json" && (typeof value !== "object" || value === null)) {
      return `“${name}” must be a JSON object or array.`;
    }
  }

  return undefined;
}

function rankQuery(query: string | undefined, values: string[]): number | undefined {
  const normalizedQuery = normalize(query ?? "");
  if (!normalizedQuery) return 0;

  const normalizedValues = values.map(normalize).filter(Boolean);
  if (normalizedValues.some((value) => value === normalizedQuery)) return 0;
  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) return 1;
  if (normalizedValues.some((value) => value.includes(normalizedQuery))) return 2;

  const combined = normalizedValues.join(" ");
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => combined.includes(token))) return 3;

  const nearestDistance = Math.min(...normalizedValues.map((value) => levenshtein(normalizedQuery, value)));
  const maximumDistance = Math.max(1, Math.floor(normalizedQuery.length * 0.25));
  return nearestDistance <= maximumDistance ? 10 + nearestDistance : undefined;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 10;
  return Math.min(25, Math.max(1, Math.floor(limit as number)));
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}

function failure(error: unknown): { success: false; error: string } {
  return { success: false, error: error instanceof Error ? error.message : String(error) };
}
