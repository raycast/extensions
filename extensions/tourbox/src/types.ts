/**
 * Application
 */
export type Application = {
  id: string;
  name: string;
  image: string;
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
  image: string;
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
  presetId: string;
  applicationId: string;
  mallSysUserId: string;
  appIcon: string;
  appName: string;
  appCardBgColor: string;
  presetTitle: string;
  systemList: string[];
  author: string;
  authorImage: string;
  download: number;
  upvote: number;
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

/**
 * Preset Detail
 */
export type PresetDetail = {
  presetId: string;
  presetTitle: string;
  appInfo: {
    id: string;
    name: string;
    image: string;
  };
  langInfoList: Array<{ id: string; name: string }>;
  categoryInfoList: Array<{ id: string; name: string }>;
  deviceInfoList: Array<{ id: string; code: string; iconPath: string | null }>;
  systemInfoList: Array<{ id: string; code: string; iconPath: string | null }>;
  tagList: Array<{ id: string; code: string }>;
  content: string;
  imageList: string;
  fileOss: string;
  fileS3: string;
  author: string;
  authorImage: string;
  autghorIntroduction: string | null;
  download: number;
  upvote: number;
  publish: boolean;
  descType: number;
  batchId: string | null;
  status: number;
};

export type PresetDetailResponse = {
  code: number;
  msg: string | null;
  result: PresetDetail;
};

/**
 * All System
 */
export type System = {
  id: string;
  code: string;
  iconPath: string | null;
};

export type AllSystemResponse = {
  code: number;
  msg: string | null;
  result: System[];
};
