type LegoColor = {
  id: number;
  name: string;
  rgb: string;
  is_trans: boolean;
};

export type LegoColorsResponse = {
  count: number;
  results: LegoColor;
};
