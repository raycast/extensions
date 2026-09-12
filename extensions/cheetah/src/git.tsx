import { Application } from "@raycast/api";
import { COMMAND } from "cheetah-core";
import searchList from "./lib/components/searchList";
import { errorHandle, getConfig } from "./lib/utils";
const command = COMMAND.GIT_GUI_OPEN; // 命令类型：编辑器打开
const forced = true; // 是否强制使用偏好设置内配置的应用

export default () => {
  const { defaultGitApp }: { defaultGitApp: Application } = getConfig();
  const appPath = defaultGitApp?.name ?? "";
  if (!appPath) {
    errorHandle(new Error("113"));
    return;
  }
  return searchList(command, appPath, forced);
};
