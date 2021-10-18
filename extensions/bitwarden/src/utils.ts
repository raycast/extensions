import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { join } from "path";


export function codeBlock(content: string): string {
  return "```\n" + content + "\n```";
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function filterNullishPropertiesFromObject(obj: any): any {
  if (!obj) return obj;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const noNullish = {}
  for key in obj {
    if (Object.hasOwnProperty(key) && (obj[key] ?? false)) {
      noNullish[key] = obj[key];
    }
  }
  
  return noNullish;
}

export function getWorkflowEnv(): { PATH: string; BW_CLIENTID: string; BW_CLIENTSECRET: string } {
  const { clientId, clientSecret, path } = getPreferenceValues();
  return { PATH: path, BW_CLIENTID: clientId, BW_CLIENTSECRET: clientSecret };
}

export function checkCliPath(): boolean {
  const {path} = getPreferenceValues()

  return existsSync(join(path, "bw"))
}
