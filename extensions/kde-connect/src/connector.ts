import { existsSync } from "fs";
import { KDEDevice } from "./device";

export const appPath = "/Applications/kdeconnect-indicator.app/Contents/MacOS/kdeconnect-cli";

export enum SendType {
  Text = "Text",
  URL = "URL",
  Files = "Files",
  SMS = "SMS",
}

export const SendTypeAllCases = (Object.keys(SendType) as (keyof typeof SendType)[]).map((key) => SendType[key]);

export function appExists() {
  return existsSync(appPath);
}

export function parseDeviceInfo(str: string): KDEDevice | undefined {
  const regex = /- (.+?): (.+?) \((.+)\)/;
  const matches = regex.exec(str);
  if (!matches) {
    return undefined;
  }

  return {
    name: matches[1],
    id: matches[2],
    paired: matches[3].includes("paired"),
    reachable: matches[3].includes("reachable"),
  };
}

interface KDECFunctionParam {
  deviceID?: string;
  args?: string[];
}
type KDECFunction = (param: KDECFunctionParam) => string | null;

// object indexed by function string
export const KDECFunctions: { [key: string]: KDECFunction } = {
  listDevices: () => {
    return "-l --refresh";
  },
  pairDevice: (params) => {
    if (!params.deviceID) {
      return null;
    }
    return `-d ${params.deviceID} --pair`;
  },
  unpairDevice: (params) => {
    if (!params.deviceID) {
      return null;
    }
    return `-d ${params.deviceID} --unpair`;
  },
  // args: [path/URL]
  share: (params) => {
    if (!params.deviceID || !params.args) {
      return null;
    }
    return `-d ${params.deviceID} --share "${params.args[0]}"`;
  },
  sendText: (params) => {
    if (!params.deviceID || !params.args) {
      return null;
    }
    return `-d ${params.deviceID} --share-text "${params.args[0]}"`;
  },
  // args: [destination, message, ...attachments]
  sendSms: (params) => {
    if (!params.deviceID || !params.args || params.args.length < 2) {
      return null;
    }
    if (params.args.length === 2) {
      return `-d ${params.deviceID} --destination "${params.args[0]}" --send-sms "${params.args[1]}"`;
    }
    const attachments = params.args
      .slice(2)
      .flatMap((path) => `"${path}"`)
      .join(" ");
    return `-d ${params.deviceID} --destination "${params.args[0]}" --send-sms "${params.args[1]}" --attachments ${attachments}`;
  },
  // args: [path]
  getPhoto: (params) => {
    if (!params.deviceID || !params.args) {
      return null;
    }
    return `-d ${params.deviceID} --photo "${params.args[0]}"`;
  },
};
