export interface Preferences {
  apiKey: string;
  gridSize: string;
  numResults: number;
  numRecentRows: number;
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

export type Format = "png" | "jpg" | "webp";

export interface Options {
  path: string;
  color: string;
  bgcolor: string | null;
  padding: number;
  size: number;
  format: Format;
}

export interface PinnedMovement {
  up: boolean;
  right: boolean;
  down: boolean;
  left: boolean;
}

export interface IconProps {
  icon: Icon8;
  refresh: () => void;
  platform?: string;
  pinned?: boolean;
  recent?: boolean;
  movement?: PinnedMovement;
  options: Options;
  setOptions: (options: Options) => void;
}

export interface IconActionProps {
  icon: Icon8;
  options: Options;
  refresh: () => void;
}

export interface ConfigureProps {
  icon: Icon8;
  options: Options;
  setOptions: (options: Options) => void;
}
