import { Alert, confirmAlert, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { buildArgNameKey } from "./arg_repository";
import Style = Toast.Style;
import ActionStyle = Alert.ActionStyle;

export async function argValueExists(argName: string, value: string) {
  const valueList = await queryArgValueList(argName);
  if (valueList == undefined) {
    return false;
  }
  for (const v of valueList) {
    if (v == value) {
      return true;
    }
  }
  return false;
}

export async function queryArgValueList(argName: string) {
  const key = buildArgNameKey(argName);

  const val = await LocalStorage.getItem<string>(key);
  if (val == undefined) {
    return undefined;
  }
  const argValueList: string[] = JSON.parse(val);
  return argValueList;
}

export async function queryArgValueListErrIfNotExistOrEmpty(argName: string, webNameList: string[] | undefined) {
  const argValueList = await queryArgValueList(argName);
  let webName = "Url";
  if (webNameList != undefined && webName.length > 0) {
    webName = webNameList[0];
  }
  if (argValueList == undefined || argValueList.length == 0) {
    await showToast(Style.Failure, '"' + webName + '" contains invalid Arg: ' + argName, "Arg dose not exist");
    await popToRoot();
  }
  if (argValueList?.length == 0) {
    await showToast(Style.Failure, '"' + webName + '" contains invalid Arg: ' + argName, "Arg is empty");
    await popToRoot();
  }
  return argValueList;
}

export async function updateArgValue(argName: string, oldArgValue: string, newArgValue: string) {
  const key = buildArgNameKey(argName);
  const val = await LocalStorage.getItem<string>(key);
  let argValueList: string[] = [];
  if (val != undefined) {
    argValueList = JSON.parse(val);
  }
  console.log("arg value before update: ", argValueList);
  let newArgValueList = [];
  if (oldArgValue == "") {
    // add new one
    newArgValueList = argValueList;
    newArgValueList.push(newArgValue);
  } else {
    // replace old
    for (const argValue of argValueList) {
      if (argValue == oldArgValue) {
        newArgValueList.push(newArgValue);
      } else {
        newArgValueList.push(argValue);
      }
    }
  }

  const s = JSON.stringify(newArgValueList);
  console.log("arg value before update: ", newArgValueList);
  await LocalStorage.setItem(key, s);
  return showToast(Style.Success, "success");
}

export async function importArgValueList(argName: string, argValueList: string[]) {
  await LocalStorage.setItem(buildArgNameKey(argName), JSON.stringify(argValueList));
}

export async function deleteArgValue(argName: string, argValueToDelete: string) {
  return await confirmAlert({
    title: "Delete Arg Value: " + argValueToDelete + "?",
    message: "",
    primaryAction: {
      title: "Delete",
      style: ActionStyle.Destructive,
      onAction: () => {
        executeArgValueDeletion(argName, argValueToDelete);
      },
    },
  });
}

async function executeArgValueDeletion(argName: string, argValueToDelete: string) {
  const key = buildArgNameKey(argName);

  const val = await LocalStorage.getItem<string>(key);
  let argValueList: string[] = [];
  if (val != undefined) {
    argValueList = JSON.parse(val);
  }
  const newArgValueList = [];
  for (const argValue of argValueList) {
    if (argValue != argValueToDelete) {
      newArgValueList.push(argValue);
    }
  }
  const s = JSON.stringify(newArgValueList);
  await LocalStorage.setItem(key, s);
}
