export type LayoutPreset = {
  id: string;
  name: string;
  widthPercentage: number;
  heightPercentage: number;
  placement: LayoutPlacement;
  commandName?: string;
  isBuiltIn?: boolean;
  isDisabledByDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LayoutFormValues = {
  name: string;
  widthPercentage: string;
  heightPercentage: string;
  placement: LayoutPlacement;
};

export type LayoutPlacement =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
