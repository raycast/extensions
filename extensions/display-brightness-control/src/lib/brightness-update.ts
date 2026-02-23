import { clampBrightness, DisplayInfo } from "./lunar";

export interface BrightnessUpdateRequest {
  serial: string;
  displayName: string;
  displayAdaptive: boolean;
  requestedBrightness: number;
}

export interface ResolvedBrightnessUpdate {
  serial: string;
  displayName: string;
  displayAdaptive: boolean;
  currentBrightness: number;
  nextBrightness: number;
  shouldSkip: boolean;
}

export function resolveBrightnessUpdate(
  displays: DisplayInfo[],
  request: BrightnessUpdateRequest,
): ResolvedBrightnessUpdate {
  const latestDisplay = displays.find((display) => display.serial === request.serial);
  const nextBrightness = clampBrightness(request.requestedBrightness);

  if (!latestDisplay) {
    return {
      serial: request.serial,
      displayName: request.displayName,
      displayAdaptive: request.displayAdaptive,
      currentBrightness: nextBrightness,
      nextBrightness,
      shouldSkip: true,
    };
  }

  const currentBrightness = clampBrightness(latestDisplay.brightness);

  return {
    serial: request.serial,
    displayName: latestDisplay.name,
    displayAdaptive: latestDisplay.adaptive,
    currentBrightness,
    nextBrightness,
    shouldSkip: nextBrightness === currentBrightness,
  };
}
