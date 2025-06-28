import { ha } from "@lib/common";
import { FieldState, HAServiceCall } from "./hooks";

export interface HAServiceFieldSelectorNumber {
  min?: number | null;
  max?: number | null;
  unit_of_measurement?: string;
}

export interface HAServiceFieldSelectorIcon {
  placeholder?: string | null;
}

export interface HAServiceFieldSelectorLabel {
  multiple?: boolean | null;
}

export interface HAServiceFieldSelectorEntity {
  multiple?: boolean | null;
}

export interface HAServiceFieldSelectorDevice {
  integration?: string | null;
}

export interface HAServiceFieldSelectorSelectOption {
  label: string;
  value: string;
}

export interface HAServiceFieldSelectorSelect {
  options?: HAServiceFieldSelectorSelectOption[] | string[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HAServiceFieldSelectorColorRgb {}

export interface HAServiceFieldSelectorColorTemp {
  unit?: string;
  min?: number;
  max?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HAServiceFieldSelectorAddon {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HAServiceFieldSelectorBackupLocation {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HAServiceFieldSelectorTime {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HAServiceFieldSelectorConversationAgent {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HAServiceFieldSelectorDatetime {}

export interface HAServiceFieldSelector {
  text?: string | null;
  area?: string | null;
  floor?: string | null;
  config_entry?: string | null;
  object?: string | null;
  number?: HAServiceFieldSelectorNumber | null;
  icon?: HAServiceFieldSelectorIcon | null;
  label?: HAServiceFieldSelectorLabel | null;
  entity?: HAServiceFieldSelectorEntity | null;
  device?: HAServiceFieldSelectorDevice | null;
  boolean?: boolean | null;
  select?: HAServiceFieldSelectorSelect | null;
  theme?: string | null;
  color_rgb?: HAServiceFieldSelectorColorRgb | null;
  color_temp?: HAServiceFieldSelectorColorTemp | null;
  addon?: HAServiceFieldSelectorAddon | null;
  backup_location?: HAServiceFieldSelectorBackupLocation | null;
  time?: HAServiceFieldSelectorTime | null;
  conversation_agent?: HAServiceFieldSelectorConversationAgent | null;
  datetime?: HAServiceFieldSelectorDatetime | null;
}

export interface HAServiceField {
  required?: boolean;
  name?: string;
  description: string;
  collapsed?: boolean; // don't show in the UI mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  example: any;
  selector?: HAServiceFieldSelector;
}

export interface HAServiceTargetEntity {
  integration?: string | null;
  domain?: string[] | null;
}

export interface HAServiceTargetArea {
  multiple?: boolean | null;
}

export interface HAServiceTarget {
  entity?: HAServiceTargetEntity[] | null;
  area?: HAServiceTargetArea | null;
}

export interface HAServiceMeta {
  name: string;
  description: string;

  fields: Record<string, HAServiceField>;
  target?: HAServiceTarget;
}

export interface HAService {
  domain: string;
  services: Record<string, HAServiceMeta> | undefined;
}

export async function getHomeAssistantServices() {
  const response = await ha.fetch("services");
  return response as HAService[] | undefined;
}

export function fullHAServiceName(serviceCall: HAServiceCall) {
  return `${serviceCall.domain}.${serviceCall.service}`;
}

export function getNameOfHAServiceField(field: HAServiceField, fallback: string) {
  if (field.name !== undefined && field.name !== null && field.name.trim().length > 0) {
    return field.name;
  }
  return fallback;
}

export interface HAServiceCallPayload {
  domain: string;
  service: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export function getHAServiceQuicklink(payload: HAServiceCallPayload) {
  const encoded = encodeURI(JSON.stringify(payload));
  return `raycast://extensions/tonka3000/homeassistant/runService?context=${encoded}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formDataToObject(userData: Record<string, any>, fields: FieldState[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const f of fields) {
    if (userData[f.id] !== undefined) {
      result[f.id] = f.toYaml(userData[f.id]);
    }
  }
  return result;
}
