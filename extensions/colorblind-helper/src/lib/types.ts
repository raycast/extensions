export interface PickedColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  colorSpace: string;
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface ColorDescription {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  basicName: string;
  detailedName: string;
  detailedDescription: string;
  confusionWarnings: ConfusionWarning[];
  simulations: ColorblindSimulation[];
}

export type ColorblindType = "protanopia" | "deuteranopia" | "tritanopia";

export interface ColorblindSimulation {
  type: ColorblindType;
  label: string;
  hex: string;
  basicName: string;
}

export interface ConfusionWarning {
  type: ColorblindType;
  label: string;
  message: string;
}
