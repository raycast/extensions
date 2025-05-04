// The Swift function exports the middle layer

import {
  getScreensInfo,
  getActiveWindowScreenInfo,
  getActiveWindowInfo,
  maximizeActiveWindow,
  resizeWindow as _resizeWindow,
} from "swift:../swift";
import { WindowDetailsObject, ResizeResult } from "./types";

// Note: getActiveWindowDetails will be renamed to getActiveWindowInfo in hooks
export { getScreensInfo, getActiveWindowScreenInfo, getActiveWindowInfo, maximizeActiveWindow };
export type { WindowDetailsObject };

// Window resize function with detailed result
export function resizeWindow(
  width: number,
  height: number,
  x?: number,
  y?: number,
  preservePosition: boolean = false,
): Promise<ResizeResult> {
  // TypeScript still sees the Swift function as returning Promise<boolean>
  // even though we updated it to return ResizeResult. We need to use type assertion
  // for now, but after Swift compilation this should work correctly.
  return _resizeWindow(
    undefined, // windowRefID
    width,
    height,
    x, // Optional x position
    y, // Optional y position
    undefined, // windowWidth
    undefined, // windowHeight
    undefined, // screenFrame
    undefined, // windowInfo
    preservePosition, // Whether to preserve exact position
  ) as Promise<ResizeResult>;
}
