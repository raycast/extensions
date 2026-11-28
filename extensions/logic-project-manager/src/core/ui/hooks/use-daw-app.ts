import { usePromise } from "@raycast/utils";
import type { Application } from "@raycast/api";
import { resolveDawApp } from "@/core/daw-app";

/** 找到 DAW 应用，用于新建项目（启动它）和图标：偏好设置里选了版本就用那个版本。 */
export function useDawApp(): Application | null {
  const { data } = usePromise(resolveDawApp, []);

  return data ?? null;
}
