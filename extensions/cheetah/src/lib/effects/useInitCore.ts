// 初始化猎豹核心模块
import { init, HOME_PATH } from "cheetah-core";
import { cachePath } from "../constant";
import { errorHandle, getConfig } from "../utils";

export default async () => {
  const { workspaces } = getConfig();
  if (!workspaces) {
    errorHandle(new Error("103"));
    return;
  }

  init({
    cachePath,
    workspaces: workspaces.replace(/~/gm, HOME_PATH),
  });
};
