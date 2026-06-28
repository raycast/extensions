export type nipponColor = {
  name: string;
  colorCode: string;
};

export type ioResponseJson = {
  index: string;
  cmyk: string;
  rgb: string;
};

export type onLoadingColors = (name: string, colorCode: string) => void;
