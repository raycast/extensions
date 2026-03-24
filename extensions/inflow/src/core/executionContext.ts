import { AppSettings, getAppSettings } from "./settings";

export interface ExecutionContext {
  settings: AppSettings;
  personalContext?: string;
}

export async function resolveExecutionContext(): Promise<ExecutionContext> {
  const settings = await getAppSettings();

  return {
    settings,
    personalContext: normalizePersonalContext(settings.personalContext),
  };
}

function normalizePersonalContext(value?: string): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}
