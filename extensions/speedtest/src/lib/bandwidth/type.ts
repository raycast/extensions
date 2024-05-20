export type InternetSpeed = {
  download: number;
  upload: number;
};

export type Nullish<T> = {
  [key in keyof T]: T[key] | undefined;
};

export type ActivitySpeedQuality = {
  [key: string]: InternetSpeed;
};
