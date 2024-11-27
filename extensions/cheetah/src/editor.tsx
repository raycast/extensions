import { Application } from "@raycast/api";
import { COMMAND } from "cheetah-core";
import searchList from "./lib/components/searchList";
import { errorHandle, getConfig } from "./lib/utils";
const command = COMMAND.OPEN; // 命令类型：编辑器打开
const forced = false; // 是否强制使用偏好设置内配置的应用

export default () => {
  const { defaultEditor }: { defaultEditor: Application } = getConfig();
  const appPath = defaultEditor?.name ?? "";
  if (!appPath) {
    errorHandle(new Error("112"));
    return;
  }
  return searchList(command, appPath, forced);
};
