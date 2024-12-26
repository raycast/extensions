type LegoMinifig = {
  set_num: string | "";
  name: string | "";
  num_parts: number | 0;
  set_img_url: string | "";
  set_url: string | "";
}

export type LegoMinifigsResponse = {
  count: number;
  results: LegoMinifig[];
  next: string | null;
}
