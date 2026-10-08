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
    undefined, // windowRefID: Swift func allows specifying a window, but this wrapper always targets the active one.
    width, // targetWidth
    height, // targetHeight
    x, // Optional x position (currentX in Swift if undefined)
    y, // Optional y position (currentY in Swift if undefined)
    undefined, // windowWidth: Swift func can use pre-fetched width, unused here.
    undefined, // windowHeight: Swift func can use pre-fetched height, unused here.
    undefined, // screenFrame: Swift func can use pre-fetched screen frame, unused here.
    undefined, // windowInfo: Swift func can use pre-fetched window details, unused here.
    preservePosition, // Whether to preserve exact position
  ) as Promise<ResizeResult>;
}
