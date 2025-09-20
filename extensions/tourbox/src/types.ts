/**
 * Application
 */
export type Application = {
  id: string;
  name: string;
};

export type AllApplicationResponse = {
  code: 0;
  msg: string | null;
  result: Application[];
};

/**
 * Category
 */
export type Category = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
};

export type AllCategoryResponse = {
  code: number;
  msg: string | null;
  result: Category[];
};

/**
 * Preset
 */
export type Preset = {
  id: string;
  title: string;
  author: string;
  sysName: string;
  applicationName: string;
  softVersion: string | null;
  info: string;
  filePath: string;
  filePathOss: string;
  downloadNum: number;
  languageName: string;
  nameArr: string[];
  createTime: number;
};

export type AllPresetResponse = {
  code: number;
  msg: string | null;
  result: {
    total: number;
    size: number;
    page: number;
    records: Preset[];
  };
};

/**
 * Software
 */
export type Software = {
  applicationId: string;
  applicationName: string;
  num: number;
  string: string;
};

export type searchSoftwareResponse = {
  code: number;
  msg: string | null;
  result: Software[];
};
