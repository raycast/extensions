import type sharp from "@gutenye/sharp";

export interface Image {
  path: string;
  format: string;
  width: number;
  height: number;
  data: sharp.Sharp;
  write: () => Promise<void>;
}
