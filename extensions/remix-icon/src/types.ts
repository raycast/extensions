export interface IconCatalog {
  categories: Category[];
}

export type Category = {
  name: string;
  icons: RemixIcon[];
};

export interface RemixIcon {
  name: string;
  path: string;
  download_url: string;
}
