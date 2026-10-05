import { LocalStorage } from "@raycast/api";

import { Instance } from "../api/types";
import { parseInstances, removeInstance, upsertInstance } from "./records";

const INSTANCES_KEY = "instances";
const SELECTED_KEY = "selected-instance-id";

export async function listInstances(): Promise<Instance[]> {
  return parseInstances(await LocalStorage.getItem<string>(INSTANCES_KEY));
}

async function writeInstances(instances: Instance[]): Promise<void> {
  await LocalStorage.setItem(INSTANCES_KEY, JSON.stringify(instances));
}

export async function saveInstance(instance: Instance): Promise<Instance[]> {
  const instances = upsertInstance(await listInstances(), instance);
  await writeInstances(instances);
  return instances;
}

export async function deleteInstance(id: string): Promise<Instance[]> {
  const instances = removeInstance(await listInstances(), id);
  await writeInstances(instances);
  // The selection is left dangling on purpose: resolveSelected falls back, and rewriting
  // it here would race with an open command.
  return instances;
}

export async function getSelectedInstanceId(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(SELECTED_KEY);
}

export async function setSelectedInstanceId(id: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_KEY, id);
}

export function newInstance(fields: Pick<Instance, "label" | "baseUrl" | "token">): Instance {
  return { id: crypto.randomUUID(), ...fields };
}
