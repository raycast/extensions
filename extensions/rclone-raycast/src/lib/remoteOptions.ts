import type { components } from "rclone-openapi";

export type BackendOption = components["schemas"]["ConfigProviderOption"];
export type FlagValue = string | boolean | number | undefined;
export type RemoteConfigState = Record<string, FlagValue>;

export function isProviderOption(option: BackendOption | undefined) {
  const fieldName = option?.FieldName?.toLowerCase();
  const optionName = option?.Name?.toLowerCase();
  return fieldName === "provider" || optionName === "provider";
}

function shouldRenderOption(option: BackendOption, config: RemoteConfigState) {
  if (!option || option.Hide !== 0) {
    return false;
  }

  if (!option.Provider) {
    return true;
  }

  const providerValue = typeof config.provider === "string" ? config.provider : "";

  if (option.Provider.startsWith("!")) {
    return config.type === "s3" && providerValue === "Other";
  }

  if (!providerValue) {
    return true;
  }

  return option.Provider.includes(providerValue);
}

export function dedupeBackendOptions(options: BackendOption[] | undefined, config: RemoteConfigState): BackendOption[] {
  if (!options) {
    return [];
  }
  const deduped = new Map<string, BackendOption>();
  options.forEach((option) => {
    if (!shouldRenderOption(option, config)) {
      return;
    }
    const fieldKey = option.FieldName || option.Name;
    if (!fieldKey) {
      return;
    }
    if (!deduped.has(fieldKey)) {
      deduped.set(fieldKey, option);
      return;
    }
    const existing = deduped.get(fieldKey)!;
    if (existing.Advanced && !option.Advanced) {
      deduped.set(fieldKey, option);
    }
  });
  return Array.from(deduped.values());
}

export function toStringValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

export function toBoolean(value: unknown, fallback: unknown): boolean {
  const candidate = value ?? fallback;
  if (typeof candidate === "boolean") {
    return candidate;
  }
  if (typeof candidate === "string") {
    return candidate === "true";
  }
  if (typeof candidate === "number") {
    return candidate !== 0;
  }
  return Boolean(candidate);
}

export function buildInfo(option: BackendOption, description: string) {
  const exampleValues = option.Examples?.map((example) => example.Value).filter(Boolean) ?? [];
  const infoParts = [];
  if (description) {
    infoParts.push(description);
  }
  if (exampleValues.length > 0) {
    infoParts.push(`Examples: ${exampleValues.slice(0, 5).join(", ")}`);
  }
  return infoParts.length > 0 ? infoParts.join("\n\n") : undefined;
}
