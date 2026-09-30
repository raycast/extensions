import { Alert, confirmAlert, LocalStorage, showToast, Toast } from "@raycast/api";
import { importArgValueList } from "./arg_value_repository";
import { ArgNameKeyPrefix, ArgNameListConfigKey } from "./constants";
import ActionStyle = Alert.ActionStyle;

export function buildArgNameKey(argName: string) {
  return ArgNameKeyPrefix + argName;
}

export async function queryArgList() {
  const s = await LocalStorage.getItem<string>(ArgNameListConfigKey);
  if (s == undefined) {
    return [];
  }
  const argList: string[] = JSON.parse(s);
  return argList;
}

export async function addNewArg(newArgName: string) {
  if (await argExist(newArgName)) {
    return showToast(Toast.Style.Failure, "arg name exists!", "consider chang a arg name");
  }
  await LocalStorage.setItem(buildArgNameKey(newArgName), "[]");
  const argList = await queryArgList();
  console.log("arg list before add: " + JSON.stringify(argList));
  argList.push(newArgName);
  console.log("arg list after add: " + JSON.stringify(argList));
  await LocalStorage.setItem(ArgNameListConfigKey, JSON.stringify(argList));

  return showToast(Toast.Style.Success, "Success");
}

export async function argExist(argName: string | undefined) {
  if (argName == undefined) {
    return false;
  }
  const argList = await queryArgList();
  for (const arg of argList) {
    if (argName == arg) {
      return true;
    }
  }

  return false;
}

export async function updateArg(newArgName: string, oldArgName: string) {
  const oldList = await queryArgList();
  const newList: string[] = [];
  for (const arg of oldList) {
    if (arg == oldArgName) {
      newList.push(newArgName);
    } else {
      newList.push(arg);
    }
  }
  await LocalStorage.setItem(ArgNameListConfigKey, JSON.stringify(newList));
  const argValueList = (await LocalStorage.getItem<string>(buildArgNameKey(oldArgName))) || "[]";
  await LocalStorage.removeItem(buildArgNameKey(oldArgName));
  await LocalStorage.setItem(buildArgNameKey(newArgName), argValueList);
}

export async function deleteArg(argName: string) {
  const argList = await queryArgList();
  const newArgList: string[] = [];
  for (const arg of argList) {
    if (arg != argName) {
      newArgList.push(arg);
    }
  }
  return await confirmAlert({
    title: "Delete Arg: " + argName + "?",
    message: "",
    primaryAction: {
      title: "Delete",
      style: ActionStyle.Destructive,
      onAction: async () => {
        await LocalStorage.setItem(ArgNameListConfigKey, JSON.stringify(newArgList));
        await LocalStorage.removeItem(buildArgNameKey(argName));
      },
    },
  });
}

export async function importArgConfigs(map: Map<string, string[]>) {
  const allArgNames: string[] = [];
  map.forEach((argValueList, argName) => {
    allArgNames.push(argName);
    importArgValueList(argName, argValueList);
  });

  await LocalStorage.setItem(ArgNameListConfigKey, JSON.stringify(allArgNames));
}
