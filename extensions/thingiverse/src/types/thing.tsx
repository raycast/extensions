export type Thing = {
  id: number;
  name: string;
  url: string;
  public_url: string;
  created_at: string;
  thumbnail: string;
  preview_image: string;
  like_count: number;
  creator: Creator;
  added: string;
  description: string;
  tags: Tag[];
  download_count: number;
  make_count: number;
  zip_data: zip_data;
};

type Creator = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  url: string;
  public_url: string;
  thumbnail: string;
};

type Tag = {
  name: string;
  tag: string;
  count: number;
};

export type ThingiverseSearchResponse = {
  total: number;
  hits: Thing[];
};

type zip_data = {
  files: files[];
  images: images[];
};

type files = {
  name: string;
  url: string;
};

type images = {
  name: string;
  url: string;
};
