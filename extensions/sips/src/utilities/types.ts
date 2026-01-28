/**
 * @file utilities/types.ts
 *
 * @summary Types used throughout the extension.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:47:41
 */

export const FilterCategory = {
  blur: "Blur",
  colorAdjustment: "Color Adjustment",
  colorEffect: "Color Effect",
  compositeOperation: "Composite Operation",
  distortion: "Distortion",
  generator: "Generator",
  gradient: "Gradient",
  halftone: "Halftone",
  sharpen: "Sharpen",
  stylize: "Stylize",
  tile: "Tile",
  stillImage: "Still Image",
  interlaced: "Interlaced",
  highDynamicRange: "High Dynamic Range",
} as const;
export type FilterCategory = (typeof FilterCategory)[keyof typeof FilterCategory];

/**
 * A wrapper around a CIFilter that can be applied to images.
 */
export type Filter = {
  /**
   * The name of the filter.
   */
  name: string;

  /**
   * A brief description of what the filter does.
   */
  description: string;

  /**
   * The CIFilter name to use when applying the filter.
   */
  CIFilterName: string;

  /**
   * The location in the extension's assets folder of the thumbnail image for the filter.
   */
  thumbnail: string;

  /**
   * The category of the filter, used to group filters in the UI. Corresponds to the CIFilter's CICategory.
   */
  category: FilterCategory;

  /**
   * Extension-level default values for the filter's inputs.
   */
  presets?: {
    [key: string]: unknown;
  };
};

/**
 * A wrapper around a CIFilter belonging to CICategoryGenerator that can be used to generate images.
 */
export type Generator = {
  /**
   * The name of the generator.
   */
  name: string;

  /**
   * The method to generate an image.
   *
   * @param destination The path to save the generated image to.
   * @param CIFilterName The name of the CIFilter to use to generate the image.
   * @param width The width of the generated image.
   * @param height The height of the generated image.
   * @param inputs The inputs to the CIFilter.
   * @returns A promise that resolves when the operation is complete.
   */
  applyMethod: (
    destination: string,
    CIFilterName: string,
    width: number,
    height: number,
    inputs: { [key: string]: unknown },
  ) => Promise<string>;

  /**
   * The CIFilter name to use when generating the image.
   */
  CIFilterName: string;

  /**
   * The location in the extension's assets folder of the thumbnail image for the generator.
   */
  thumbnail: string;
};

/**
 * Keys for generator filters.
 */
export type GeneratorKey =
  | "Checkerboard"
  | "ConstantColor"
  | "LenticularHalo"
  | "LinearGradient"
  | "RadialGradient"
  | "Random"
  | "StarShine"
  | "Stripes"
  | "Sunbeams";

/**
 * The options to use when generating an image. Corresponds to the key-value pairs in the CIFilter's input dictionary.
 */
export type GeneratorOptions = {
  [key: string]: unknown;
};

export type Color = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

export const Colors = {
  aliceblue: "#F0F8FFFF",
  antiquewhite: "#FAEBD7FF",
  aqua: "#00FFFFFF",
  aquamarine: "#7FFFD4FF",
  azure: "#F0FFFFFF",
  beige: "#F5F5DCFF",
  bisque: "#FFE4C4FF",
  black: "#000000FF",
  blanchedalmond: "#FFEBCDFF",
  blue: "#0000FFFF",
  blueviolet: "#8A2BE2FF",
  brown: "#A52A2AFF",
  burlywood: "#DEB887FF",
  cadetblue: "#5F9EA0FF",
  chartreuse: "#7FFF00FF",
  chocolate: "#D2691EFF",
  coral: "#FF7F50FF",
  cornflowerblue: "#6495EDFF",
  cornsilk: "#FFF8DCFF",
  crimson: "#DC143CFF",
  cyan: "#00FFFFFF",
  darkblue: "#00008BFF",
  darkcyan: "#008B8BFF",
  darkgoldenrod: "#B8860BFF",
  darkgray: "#A9A9A9FF",
  darkgrey: "#A9A9A9FF",
  darkgreen: "#006400FF",
  darkkhaki: "#BDB76BFF",
  darkmagenta: "#8B008BFF",
  darkolivegreen: "#556B2FFF",
  darkorange: "#FF8C00FF",
  darkorchid: "#9932CCFF",
  darkred: "#8B0000FF",
  darksalmon: "#E9967AFF",
  darkseagreen: "#8FBC8FFF",
  darkslateblue: "#483D8BFF",
  darkslategray: "#2F4F4FFF",
  darkslategrey: "#2F4F4FFF",
  darkturquoise: "#00CED1FF",
  darkviolet: "#9400D3FF",
  deeppink: "#FF1493FF",
  deepskyblue: "#00BFFFFF",
  dimgray: "#696969FF",
  dimgrey: "#696969FF",
  dodgerblue: "#1E90FFFF",
  firebrick: "#B22222FF",
  floralwhite: "#FFFAF0FF",
  forestgreen: "#228B22FF",
  fuchsia: "#FF00FFFF",
  gainsboro: "#DCDCDCFF",
  ghostwhite: "#F8F8FFFF",
  gold: "#FFD700FF",
  goldenrod: "#DAA520FF",
  gray: "#808080FF",
  grey: "#808080FF",
  green: "#008000FF",
  greenyellow: "#ADFF2FFF",
  honeydew: "#F0FFF0FF",
  hotpink: "#FF69B4FF",
  indianred: "#CD5C5CFF",
  indigo: "#4B0082FF",
  ivory: "#FFFFF0FF",
  khaki: "#F0E68CFF",
  lavender: "#E6E6FAFF",
  lavenderblush: "#FFF0F5FF",
  lawngreen: "#7CFC00FF",
  lemonchiffon: "#FFFACDFF",
  lightblue: "#ADD8E6FF",
  lightcoral: "#F08080FF",
  lightcyan: "#E0FFFFFF",
  lightgoldenrodyellow: "#FAFAD2FF",
  lightgray: "#D3D3D3FF",
  lightgrey: "#D3D3D3FF",
  lightgreen: "#90EE90FF",
  lightpink: "#FFB6C1FF",
  lightsalmon: "#FFA07AFF",
  lightseagreen: "#20B2AAFF",
  lightskyblue: "#87CEFAFF",
  lightslategray: "#778899FF",
  lightslategrey: "#778899FF",
  lightsteelblue: "#B0C4DEFF",
  lightyellow: "#FFFFE0FF",
  lime: "#00FF00FF",
  limegreen: "#32CD32FF",
  linen: "#FAF0E6FF",
  magenta: "#FF00FFFF",
  maroon: "#800000FF",
  mediumaquamarine: "#66CDAAFF",
  mediumblue: "#0000CDFF",
  mediumorchid: "#BA55D3FF",
  mediumpurple: "#9370D8FF",
  mediumseagreen: "#3CB371FF",
  mediumslateblue: "#7B68EEFF",
  mediumspringgreen: "#00FA9AFF",
  mediumturquoise: "#48D1CCFF",
  mediumvioletred: "#C71585FF",
  midnightblue: "#191970FF",
  mintcream: "#F5FFFAFF",
  mistyrose: "#FFE4E1FF",
  moccasin: "#FFE4B5FF",
  navajowhite: "#FFDEADFF",
  navy: "#000080FF",
  oldlace: "#FDF5E6FF",
  olive: "#808000FF",
  olivedrab: "#6B8E23FF",
  orange: "#FFA500FF",
  orangered: "#FF4500FF",
  orchid: "#DA70D6FF",
  palegoldenrod: "#EEE8AAFF",
  palegreen: "#98FB98FF",
  paleturquoise: "#AFEEEEFF",
  palevioletred: "#D87093FF",
  papayawhip: "#FFEFD5FF",
  peachpuff: "#FFDAB9FF",
  peru: "#CD853FFF",
  pink: "#FFC0CBFF",
  plum: "#DDA0DDFF",
  powderblue: "#B0E0E6FF",
  purple: "#800080FF",
  rebeccapurple: "#663399FF",
  red: "#FF0000FF",
  rosybrown: "#BC8F8FFF",
  royalblue: "#4169E1FF",
  saddlebrown: "#8B4513FF",
  salmon: "#FA8072FF",
  sandybrown: "#F4A460FF",
  seagreen: "#2E8B57FF",
  seashell: "#FFF5EEFF",
  sienna: "#A0522DFF",
  silver: "#C0C0C0FF",
  skyblue: "#87CEEBFF",
  slateblue: "#6A5ACDFF",
  slategray: "#708090FF",
  slategrey: "#708090FF",
  snow: "#FFFAFAFF",
  springgreen: "#00FF7FFF",
  steelblue: "#4682B4FF",
  tan: "#D2B48CFF",
  teal: "#008080FF",
  thistle: "#D8BFD8FF",
  tomato: "#FF6347FF",
  turquoise: "#40E0D0FF",
  violet: "#EE82EEFF",
  wheat: "#F5DEB3FF",
  white: "#FFFFFFFF",
  whitesmoke: "#F5F5F5FF",
  yellow: "#FFFF00FF",
  yellowgreen: "#9ACD32FF",
};
