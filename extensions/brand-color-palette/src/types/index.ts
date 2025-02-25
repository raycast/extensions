export type PalletType = "primitives" | "tokens";
export type ColorType = "primitive" | "token";
export type TokenMode = "light" | "dark";

interface BaseColor {
  id: string;
  name: string;
  description?: string;
  type: ColorType;
}

export interface PrimitiveColor extends BaseColor {
  type: "primitive";
  value: string;
}

export interface TokenColor extends BaseColor {
  type: "token";
  values: {
    light: string;
    dark: string;
  };
}

export type ColorPaletteItem = PrimitiveColor | TokenColor;

export interface ColorItemProps {
  color: ColorPaletteItem;
  tokenMode: TokenMode;
  onUpdate: () => void;
}

export interface FrontMostApp {
  name: string;
  iconPath: string;
}

export interface ViewSelectorProps {
  selectedView: PalletType;
  onViewChange: (view: PalletType) => void;
  onSave: () => void;
}

export interface ColorSectionProps {
  title: string;
  colors: ColorPaletteItem[];
  tokenMode: TokenMode;
  onUpdate: () => void;
}

export interface ColorFormProps {
  color?: ColorPaletteItem;
  onSave?: () => void;
  currentView: PalletType;
}
