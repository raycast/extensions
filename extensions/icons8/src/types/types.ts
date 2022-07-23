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
  url: string;
  link: string;
  color: boolean;
  svg: string;
  png?: Buffer;
  mdImage?: string;
  description?: string;
  style?: string;
  category?: string;
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
