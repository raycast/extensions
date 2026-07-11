export const DDG_URL = "https://duckduckgo.com/";
// noinspection SpellCheckingInspection
export const HEADERS = {
  dnt: "1",
  "accept-encoding": "gzip, deflate, sdch",
  "x-requested-with": "XMLHttpRequest",
  "accept-language": "en-GB,en-US;q=0.8,en;q=0.6,ms;q=0.4",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36",
  accept: "application/json, text/javascript, */*; q=0.01",
  referer: "https://duckduckgo.com/",
  authority: "duckduckgo.com",
} as const;
export const DEFAULT_RETRIES = 4;
export const DEFAULT_SLEEP = 2000; // 2 seconds
export const DEFAULT_TIMEOUT = 3000; // 3 seconds

export type ValueOf<T> = T[keyof T];

/** The types of image size. */
export const ImageSize: Record<string, string> = {
  /** Any size. */
  ALL: "",
  /** Small size, less than 200x200. */
  SMALL: "Small",
  /** Medium size, approx. between 200x200 and 500x500. */
  MEDIUM: "Medium",
  /** Large size, approx. between 500x500 and 2000x2000. */
  LARGE: "Large",
  /** Wallpaper size, larger than 1200x1200. */
  WALLPAPER: "Wallpaper",
} as const;

export type ImageSizes = ValueOf<typeof ImageSize>;

/** The types of images. */
export const ImageType: Record<string, string> = {
  /** Any images. */
  ALL: "",
  /** Any regular photos. */
  PHOTOGRAPH: "photo",
  /** Clip-art. */
  CLIPART: "clipart",
  /** Animated GIFs. */
  GIF: "gif",
  /** Transparent photos. */
  TRANSPARENT: "transparent",
} as const;

export type ImageTypes = ValueOf<typeof ImageType>;

/** The types of image layouts. */
export const ImageLayout: Record<string, string> = {
  /** Any size of images. */
  "Any size": "",
  /** Square images. Images may not be exactly square. */
  Square: "Square",
  /** Tall images. More height than width. */
  Tall: "Tall",
  /** Wide images. More width than height. */
  Wide: "Wide",
} as const;

export type ImageLayouts = ValueOf<typeof ImageLayout>;

/** The types of image color. */
export const ImageColor: Record<string, string> = {
  /** Any image. */
  ALL: "",
  /** Any image with color. */
  COLOR: "color",
  /** Any monochrome images. */
  BLACK_AND_WHITE: "Monochrome",
  /** Mostly red images. */
  RED: "Red",
  /** Mostly orange images. */
  ORANGE: "Orange",
  /** Mostly yellow images. */
  YELLOW: "Yellow",
  /** Mostly green images. */
  GREEN: "Green",
  /** Mostly blue images. */
  BLUE: "Blue",
  /** Mostly pink images. */
  PINK: "Pink",
  /** Mostly brown images. */
  BROWN: "Brown",
  /** Mostly black images. */
  BLACK: "Black",
  /** Mostly gray images. */
  GRAY: "Gray",
  /** Alias for `GRAY`. */
  GREY: "Gray",
  /** Mostly teal images. */
  TEAL: "Teal",
  /** Mostly white images. */
  WHITE: "White",
} as const;

export type ImageColors = ValueOf<typeof ImageColor>;

/** The types of image license. */
export const ImageLicense: Record<string, string> = {
  /** Any image license. */
  ALL: "",
  /** All Creative Commons. */
  CREATIVE_COMMONS: "Any",
  /** Public Domain images. */
  PUBLIC_DOMAIN: "Public",
  /** Free to share and use. */
  SHARE: "Share",
  /** Free to share and use commercially. */
  SHARE_COMMERCIALLY: "ShareCommercially",
  /** Free to modify, share, and use. */
  MODIFY: "Modify",
  /** Free to modify, share, and use commercially. */
  MODIFY_COMMERCIALLY: "ModifyCommercially",
} as const;

export type ImageLicenses = ValueOf<typeof ImageLicense>;

export interface ImageSearchOptionsFilters {
  /** The color filter of the images. */
  color?: ImageColors;
  /** The layout of the images to search. */
  layout?: ImageLayouts;
  /** The size filter of the images to search. */
  size?: ImageSizes;
  /** The type of the images to search. */
  type?: ImageTypes;
  /** The license of the images to search. */
  license?: ImageLicenses;
}

/** The options for {@link imageSearch}. */
export interface ImageSearchOptions {
  /** The safe search type of the search. */
  moderate?: boolean;
  /** The locale(?) of the search. Defaults to "en-us". */
  locale?: string;
  /**
   * The string that acts like a key to a search.
   * Set this if you made a search with the same query.
   */
  vqd?: string;
  /** The filters of the images to search. */
  filters?: ImageSearchOptionsFilters;
}

// Old VQD Error
export class OldVQDError extends Error {
  constructor(message = "Old VQD token") {
    super(message);
    this.name = "OldVQDError";
  }
}
