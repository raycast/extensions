import type sharp from "sharp";

export interface Image {
  path: string;
  format: string;
  width: number;
  height: number;
  data: sharp.Sharp;
  write: () => Promise<void>;
}
