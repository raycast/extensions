import { ha } from "@lib/common";

export interface HAServiceFieldSelectorNumber {
  min?: number | null;
  max?: number | null;
  unit_of_measurement?: string;
}

export interface HAServiceFieldSelector {
  text?: string | null;
  area?: string | null;
  floor?: string | null;
  config_entry?: string | null;
  object?: string | null;
  number?: HAServiceFieldSelectorNumber | null;
}

export interface HAServiceField {
  required?: boolean;
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  example: any;
  selector?: HAServiceFieldSelector;
}

export interface HAServiceTargetEntity {}

export interface HAServiceTarget {
  entity?: HAServiceTargetEntity[] | null;
}

export interface HAServiceMeta {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
