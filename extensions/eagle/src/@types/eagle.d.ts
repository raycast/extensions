export type Application = {
  version: string;
  prereleaseVersion: string | null;
  buildVersion: string;
  execPath: string;
  platform: string;
};

export type ColorPalette = {
  color: [number, number, number];
  ratio: number;
};

export type Item = {
  id: string;
  name: string;
  size: number;
  ext: string;
  tags: string[];
  folders: string[];
  isDeleted: boolean;
  url: string;
  annotation: string;
  modificationTime: number;
  width: number;
  height: number;
  noThumbnail: boolean;
  lastModified: number;
  palettes: ColorPalette[];
};

export type Folder = {
  id: string;
  name: string;
  description: string;
  children: (Folder & {
    parent: string;
  })[];
  modificationTime: number;
  tags: string[];
  imageCount: number;
  descendantImageCount: number;
  pinyin: string;
  extendTags: string[];
};

export type EagleAPIResponse<T> = {
  status: "success";
  data: T;
};
