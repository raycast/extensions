export class ArgItem {
  title: string;
  val: string;

  constructor(title: string, val: string) {
    this.title = title;
    this.val = val;
  }
}

export class UrlItem {
  title: string;
  val: string;
  argsNameList: string[];
  argValList: string[];

  constructor(title: string, val: string, argsNameList: string[]) {
    this.title = title;
    this.val = val;
    this.argsNameList = argsNameList;
    this.argValList = [];
  }

  addArgVal(argVal: string) {
    this.argValList.push(argVal);
  }

  buildFullUrl() {
    let url = this.val;
    for (let i = 0; i < this.argValList.length; i++) {
      url = url.replace("${" + i + "}", this.argValList[i]);
    }
    console.log("build url:" + url);
    return url;
  }

  appendLastArgAndBuildFullUrl(lastArg: string) {
    this.addArgVal(lastArg);
    return this.buildFullUrl();
  }
}

export class Config<T> {
  name: string;
  list: T[];

  constructor(name: string, list: T[]) {
    this.name = name;
    this.list = list;
  }
}

export interface ConfigInfo {
  configName: string;
  itemValue: string;
  argList: string[];
}

export interface ImportInput {
  importedConfig: string;
}
