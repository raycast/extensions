import { readFileSync } from "fs";
import { KDEDevice } from "./device";

export const appPath = "/Applications/kdeconnect-indicator.app/Contents/MacOS/kdeconnect-cli";

export function appExists() {
  try {
    readFileSync(appPath);
    return true;
  } catch (e) {
    return false;
  }
}

export function parseDeviceInfo(str: string): KDEDevice | undefined {
  const regex = /- (.+?): (.+?) \((.+)\)/;
  const matches = regex.exec(str);
  console.log(matches);
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
};
