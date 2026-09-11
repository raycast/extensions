export type AngleMode = "degrees" | "radians";

export type AngleModeState = {
  mode: AngleMode;
  preference: AngleMode;
};

export const ANGLE_MODE_STORAGE_KEY = "angle-mode";

export function getAngleMode(state: AngleModeState | undefined, preference: AngleMode): AngleMode {
  return state?.preference === preference ? state.mode : preference;
}

export function createAngleModeState(mode: AngleMode, preference: AngleMode): AngleModeState {
  return { mode, preference };
}

export function toggleAngleMode(mode: AngleMode): AngleMode {
  return mode === "degrees" ? "radians" : "degrees";
}

function toRadians(value: number, angleMode: AngleMode): number {
  return angleMode === "degrees" ? (value * Math.PI) / 180 : value;
}

function fromRadians(value: number, angleMode: AngleMode): number {
  return angleMode === "degrees" ? (value * 180) / Math.PI : value;
}

export function createTrigonometricFunctions(angleMode: AngleMode) {
  return {
    sin: (value: number) => Math.sin(toRadians(value, angleMode)),
    cos: (value: number) => Math.cos(toRadians(value, angleMode)),
    tan: (value: number) => Math.tan(toRadians(value, angleMode)),
    asin: (value: number) => fromRadians(Math.asin(value), angleMode),
    acos: (value: number) => fromRadians(Math.acos(value), angleMode),
    atan: (value: number) => fromRadians(Math.atan(value), angleMode),
  };
}
