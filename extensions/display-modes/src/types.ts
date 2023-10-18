export interface DisplayInfo {
  display: Display;
  currentMode: Mode;
  modes: Mode[];
}

export interface Display {
  id: number;
  kind: DisplayKind;
}

export enum DisplayKind {
  builtIn = "builtIn",
  external = "external",
}

export interface Mode {
  width: number;
  height: number;
  refreshRate: number;
  horizontalResolution?: number;
  verticalResolution?: number;
  pixelsWide?: number;
  pixelsHigh?: number;
  depthFormat?: number;
  unavailable?: boolean;
  isSuitableForUI?: boolean;
  isSafeForHardware?: boolean;
  isStretched?: boolean;
  scale?: number;
  mode?: number;
  id?: number;
}

export function areModesEqual(a?: Mode, b?: Mode): boolean {
  if (a === undefined && b === undefined) return true; // Both are undefined
  if (a === undefined || b === undefined) return false; // One is undefined but not the other

  return (
    a.width === b.width &&
    a.height === b.height &&
    a.refreshRate === b.refreshRate &&
    a.horizontalResolution === b.horizontalResolution &&
    a.verticalResolution === b.verticalResolution &&
    a.pixelsWide === b.pixelsWide &&
    a.pixelsHigh === b.pixelsHigh &&
    a.depthFormat === b.depthFormat &&
    a.unavailable === b.unavailable &&
    a.isSuitableForUI === b.isSuitableForUI &&
    a.isSafeForHardware === b.isSafeForHardware &&
    a.isStretched === b.isStretched &&
    a.scale === b.scale &&
    a.mode === b.mode &&
    a.id === b.id
  );
}
