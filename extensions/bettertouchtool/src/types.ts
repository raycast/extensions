export interface NamedTriggerAction {
  name: string;
  enabled: boolean;
}

export interface NamedTrigger {
  uuid: string;
  name: string;
  enabled: boolean;
  actions: NamedTriggerAction[];
  groupName?: string;
}

export interface NamedTriggerGroup {
  uuid: string;
  name: string;
  parentUUID?: string;
}

type Success<T> = T extends void ? { status: "success" } : { status: "success"; data: T };
export type Result<T> = Success<T> | { status: "error"; error: string };
export type SetVariableValue = { type: "string"; value: string } | { type: "number"; value: number };
