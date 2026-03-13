import { LocalStorage } from "@raycast/api";
import { importArgConfigs, queryArgList } from "./arg_repository";
import { queryArgValueList } from "./arg_value_repository";
import { importUrlConfig, queryUrlConfigs, UrlConfigs, UrlConfigValue } from "./url_repository";

export async function platformNameExists(platformName: string | undefined) {
  if (platformName == undefined) {
    return true;
  }
  const val = await LocalStorage.getItem<string>(platformName);
  return val && val?.trim().length > 0;
}

export async function exportAllConfigs() {
  const argConfigs = new ArgConfigs();
  const argList = await queryArgList();

  for (const arg of argList) {
    const argValueList = await queryArgValueList(arg);
    argConfigs.addPair(arg, argValueList);
  }

  const urlConfigs = await queryUrlConfigs();

  const resObj = {
    urlConfigs: Object.fromEntries(urlConfigs.urlConfigs),
    argConfigs: Object.fromEntries(argConfigs.arg2ValuesMap),
  };
  return JSON.stringify(resObj, null, "\t");
}

export async function importConfigs(s: string) {
  await LocalStorage.clear();
  const parsed: AllConfigs = JSON.parse(s);

  const urlConfigs = new UrlConfigs(JSON.stringify(parsed.urlConfigs));
  await importUrlConfig(urlConfigs);

  const argConfigs = new Map<string, string[]>(Object.entries(parsed.argConfigs || ""));
  console.log(argConfigs);
  await importArgConfigs(argConfigs);
}

interface AllConfigs {
  urlConfigs: Map<string, UrlConfigValue>;
  argConfigs: Map<string, string[]>;
}

class ArgConfigs {
  arg2ValuesMap: Map<string, string[]>;

  constructor() {
    this.arg2ValuesMap = new Map<string, string[]>();
  }

  setMap(map: Map<string, string[]>) {
    this.arg2ValuesMap = map;
  }

  addPair(arg: string, valueList: string[] | undefined) {
    if (valueList == undefined) {
      this.arg2ValuesMap.set(arg, []);
    } else {
      this.arg2ValuesMap.set(arg, valueList);
    }
  }

  parse(s: string) {
    if (s == undefined || s == "") {
      this.arg2ValuesMap = new Map<string, string[]>();
    }
    const map: Map<string, string[]> = JSON.parse(s);
    this.setMap(map);
  }

  toString() {
    return JSON.stringify(Object.fromEntries(this.arg2ValuesMap), null, 4);
  }
}
