import { COMMAND } from "cheetah-core";
import searchList from "./lib/components/searchList";
const command = COMMAND.FOLDER_OPEN; // 命令类型：编辑器打开
const forced = true; // 是否强制使用偏好设置内配置的应用

export default () => {
  return searchList(command, "Finder", forced);
};
