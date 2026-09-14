/**
 * 测试用的 @raycast/api 桩。
 *
 * 扩展里只有 i18n 用到了它(读偏好设置决定界面语言),真实模块在 Raycast 进程外导入会炸。
 * 返回空对象即可:t() 拿不到 language 时按英文走,和真实环境里没设偏好时一致。
 */
export function getPreferenceValues<T = Record<string, unknown>>(): T {
  return {} as T;
}
