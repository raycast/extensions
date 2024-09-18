import { Alert, confirmAlert, LocalStorage, showToast, Toast } from "@raycast/api";
import { WebNameConfigKey } from "./constants";
import { ConfigInfo } from "./models";
import ActionStyle = Alert.ActionStyle;

export async function queryUrlConfigs() {
  const s = await LocalStorage.getItem<string>(WebNameConfigKey);
  return new UrlConfigs(s);
}

export async function webNameExists(webName: string) {
  const webConfigs = await queryUrlConfigs();
  return webConfigs.webNameExists(webName);
}

export async function addUrlConfig(urlInfo: ConfigInfo) {
  const webConfigs = await queryUrlConfigs();
  if (webConfigs.webNameExists(urlInfo.configName)) {
    return await showToast(Toast.Style.Failure, "platform name exists!", "consider change a name");
  }

  console.log("url config before add", webConfigs.toString());
  webConfigs.set(urlInfo.configName, urlInfo.itemValue, urlInfo.argList);
  const str = webConfigs.toString();
  console.log(str);
  await LocalStorage.setItem(WebNameConfigKey, str);
}

export async function updateUrlConfig(urlInfo: ConfigInfo, oldWebName: string) {
  const webConfigs = await queryUrlConfigs();

  console.log("url config before update", webConfigs.toString());
  webConfigs.delete(oldWebName);
  webConfigs.set(urlInfo.configName, urlInfo.itemValue, urlInfo.argList);
  const str = webConfigs.toString();
  console.log(str);
  await LocalStorage.setItem(WebNameConfigKey, str);
}

export async function deleteUrlConfig(webName: string, urlConfigs: UrlConfigs) {
  return await confirmAlert({
    title: "Delete Url Config: " + webName + "?",
    message: "",
    primaryAction: {
      title: "Delete",
      style: ActionStyle.Destructive,
      onAction: async () => {
        console.log("url config before deletion:", urlConfigs.toString());
        urlConfigs.urlConfigs.delete(webName);
        console.log("url config after deletion:", urlConfigs.toString());
        await LocalStorage.setItem(WebNameConfigKey, urlConfigs.toString());
      },
    },
  });
}

export async function importUrlConfig(urlConfigs: UrlConfigs) {
  await LocalStorage.setItem(WebNameConfigKey, urlConfigs.toString());
}

export class UrlConfigs {
  urlConfigs: Map<string, UrlConfigValue>;

  constructor(s: string | undefined) {
    this.urlConfigs = this.parse(s);
  }

  parse(s: string | undefined) {
    if (s == undefined || s.trim().length == 0) {
      return new Map<string, UrlConfigValue>();
    }

    return new Map<string, UrlConfigValue>(Object.entries(JSON.parse(s)));
  }

  webNameExists(webName: string) {
    return this.urlConfigs.has(webName);
  }

  set(webName: string, urlPattern: string, argList: string[]) {
    this.urlConfigs.set(webName, new UrlConfigValue(urlPattern, argList));
  }

  delete(webName: string) {
    this.urlConfigs.delete(webName);
  }

  toString() {
    return JSON.stringify(Object.fromEntries(this.urlConfigs));
  }
}

export class UrlConfigValue {
  urlPattern: string;
  args: string[];

  constructor(urlPattern: string, args: string[]) {
    this.urlPattern = urlPattern;
    this.args = args;
  }
}
