import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Instance } from "../types";

export type ResolveFailureReason = "no-profiles" | "not-found" | "no-selection";

export type ResolveResult =
  | { ok: true; instance: Instance; instances: Instance[] }
  | { ok: false; reason: ResolveFailureReason; toast: ToastShape };

export type ToastShape = { style: Toast.Style; title: string; message: string };

export const NO_PROFILES_TOAST: ToastShape = {
  style: Toast.Style.Failure,
  title: "No instances found",
  message: "Please create an instance profile first",
};

export const NO_SELECTION_TOAST: ToastShape = {
  style: Toast.Style.Failure,
  title: "No instance selected",
  message: "Pass an instance name as argument or select one in Manage Instance Profiles",
};

export const notFoundToast = (instanceName: string): ToastShape => ({
  style: Toast.Style.Failure,
  title: "Instance not found",
  message: `No instance found with URL or alias containing "${instanceName}"`,
});

export function matchInstance(instances: Instance[], instanceName: string): Instance | undefined {
  const needle = instanceName.toLowerCase();
  return instances.find((i) => i.name.toLowerCase().includes(needle) || i.alias?.toLowerCase().includes(needle));
}

async function loadInstances(): Promise<Instance[] | undefined> {
  const item = await LocalStorage.getItem<string>("saved-instances");
  if (!item) return undefined;
  return JSON.parse(item) as Instance[];
}

export async function resolveInstance(instanceName?: string): Promise<ResolveResult> {
  const instances = await loadInstances();
  if (!instances) return { ok: false, reason: "no-profiles", toast: NO_PROFILES_TOAST };

  if (instanceName) {
    const instance = matchInstance(instances, instanceName);
    if (!instance) return { ok: false, reason: "not-found", toast: notFoundToast(instanceName) };
    return { ok: true, instance, instances };
  }

  const selectedRaw = await LocalStorage.getItem<string>("selected-instance");
  if (!selectedRaw) return { ok: false, reason: "no-selection", toast: NO_SELECTION_TOAST };
  const instance = JSON.parse(selectedRaw) as Instance;
  return { ok: true, instance, instances };
}

export async function resolveInstanceOrToast(
  instanceName?: string,
): Promise<{ instance: Instance; instances: Instance[] } | undefined> {
  const result = await resolveInstance(instanceName);
  if (result.ok) return { instance: result.instance, instances: result.instances };
  showToast(result.toast);
  return undefined;
}

export async function loadInstancesOrToast(): Promise<Instance[] | undefined> {
  const instances = await loadInstances();
  if (!instances) {
    showToast(NO_PROFILES_TOAST);
    return undefined;
  }
  return instances;
}
