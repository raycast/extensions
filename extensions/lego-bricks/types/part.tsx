type LegoPart = {
  part_num: string | "";
  name: string | "";
  part_cat_id: number | 0;
  part_url: string | "";
  part_img_url: string | "";
  print_of: string | "";
}

export type LegoPartsResponse = {
  count: number | 0;
  next: string | "";
  previous: string | "";
  results: LegoPart[];
}
