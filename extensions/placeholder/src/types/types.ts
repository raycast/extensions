export interface PicsumConfig {
  id?: number; // Get certain image with given ID (0)
  width?: number; // Image width (200)
  height?: number; // Image height (200)
  jpg?: boolean; // Get image url as .jpg (false)
  blur?: number; // Level of image blurriness form 0-10 (0)
  cache?: boolean; // Allow browser image cache, (true)
  grayscale?: boolean; // Image grayscale or normal, (false)
  staticRandom?: boolean; // Image grayscale or normal, (false)
}

export interface RandomImageConfig {
  width: string;
  height: string;
  blur: string;
  jpg: boolean;
  cache: boolean;
  grayscale: boolean;
  staticRandom: boolean;
}
export const randomImageConfigInit = {
  width: "300",
  height: "300",
  blur: "0",
  jpg: false,
  cache: false,
  grayscale: false,
  staticRandom: true,
};

export interface PicsumImage {
  id: string;
  author: string;
  width: number;
  height: number;
  url: string;
  download_url: string;
}

export interface SpecifyIdImageConfig {
  id: string;
  width: string;
  height: string;
  blur: string;
  jpg: boolean;
  cache: boolean;
  grayscale: boolean;
}
export const specifyIdImageConfigInit = {
  id: "0",
  width: "300",
  height: "300",
  blur: "0",
  jpg: false,
  cache: false,
  grayscale: false,
};
