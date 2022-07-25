export interface Preferences {
  apiKey: string;
  gridSize: string;
  numResults: number;
  downloadPath: string;
  numRecent: number;
}

export interface Icon8 {
  id: string;
  name: string;
  commonName: string;
  url: string;
  link: string;
  isColor: boolean;

  platform: string;
  style?: string;
  category?: string;

  svg: string;
  mdImage?: string;
  downloadName?: string;

  description?: string;
  tags?: string[];
  isFree?: boolean;
  isAnimated?: boolean;
  published?: Date;
}

export interface Style {
  code: string;
  title: string;
  count: number;
  url: string;
}
