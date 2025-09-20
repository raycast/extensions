import {
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { ErrorCodeMessage } from "./constant";
import { Preferences } from "./types";

/**
 * @description: 获取插件偏好设置
 * @return {Preferences} 当前插件的偏好设置
 */
export function getConfig(): Preferences {
  return getPreferenceValues();
}

/**
 * @description: 睡眠魔法
 * @param {number} interval 睡眠的毫秒数
 * @return {*}
 */
export function sleep(interval: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      resolve();
    }, interval);
  });
}

/**
 * @description: 错误处理并输出
 * @param {any} error
 * @return {*}
 */
export async function errorHandle(error: any): Promise<void> {
  const errorCode: string = error.message;
  const needHandleCodes = ["112", "113", "114", "103"];
  await showHUD(ErrorCodeMessage[errorCode]);
  popToRoot({ clearSearchBar: true });
  if (needHandleCodes.includes(errorCode)) {
    openExtensionPreferences();
  }
}
