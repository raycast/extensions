import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { ServiceDefinition } from "./types";

const CUSTOM_SERVICES_KEY = "custom-services-v1";

function normalizeServiceUrl(url: string | undefined, fallbackName: string): string {
  const trimmed = url?.trim();
  if (!trimmed) return `${fallbackName.toLowerCase().replace(/\s+/g, "")}.com`;

  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function mergeCustomService(
  services: ServiceDefinition[],
  service: ServiceDefinition,
  previousName?: string,
): ServiceDefinition[] {
  const namesToReplace = new Set(
    [service.name, previousName].filter((name): name is string => Boolean(name)).map((name) => name.toLowerCase()),
  );
  const withoutExisting = services.filter((s) => !namesToReplace.has(s.name.toLowerCase()));
  return [...withoutExisting, service].sort((a, b) => a.name.localeCompare(b.name));
}

export function useCustomServices() {
  return useLocalStorage<ServiceDefinition[]>(CUSTOM_SERVICES_KEY, []);
}

export async function saveCustomService({
  name,
  iconUrl,
  category,
  previousName,
}: {
  name: string;
  iconUrl?: string;
  category: string;
  previousName?: string;
}) {
  const raw = await LocalStorage.getItem<string>(CUSTOM_SERVICES_KEY);
  let current: ServiceDefinition[] = [];
  try {
    current = raw ? (JSON.parse(raw) as ServiceDefinition[]) : [];
  } catch {
    current = [];
  }

  const service = {
    name,
    domain: normalizeServiceUrl(iconUrl, name),
    category,
    custom: true,
  };

  await LocalStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(mergeCustomService(current, service, previousName)));
}
