export type LegoSet = {
  set_num: string | "";
  name: string | "";
  year: number | 0;
  theme_id: number | 0;
  num_parts: number | 0;
  set_img_url: string | "";
  set_url: string | "";
}

export type LegoSetsResponse = {
  count: number;
  next: string | null;
  results: LegoSet[];
}
