import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { dirname } from "path/posix";

export function codeBlock(content: string): string {
  return "```\n" + content + "\n```";
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function filterNullishPropertiesFromObject(obj: any): any {
  if (!obj) return obj;
  const noNullish: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key) && (obj[key] ?? false)) {
      noNullish[key] = obj[key];
    }
  }

  return noNullish;
}

export function getWorkflowEnv(): { PATH: string; BW_CLIENTID: string; BW_CLIENTSECRET: string } {
  const { clientId, clientSecret, CliPath } = getPreferenceValues();
  return { PATH: dirname(CliPath), BW_CLIENTID: clientId, BW_CLIENTSECRET: clientSecret };
}

export function checkCliPath(): boolean {
  const { CliPath } = getPreferenceValues();

  return existsSync(CliPath);
}
