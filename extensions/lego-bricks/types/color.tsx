type LegoColor = {
  id: number;
  name: string;
  rgb: string;
  is_trans: boolean;
};

export type LegoColorsResponse = {
  count: number;
  next: string | null;
  results: LegoColor[];
};
