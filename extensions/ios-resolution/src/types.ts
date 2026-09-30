export interface Device {
  id: string;
  name: string;
  family: "iPhone" | "MacBook" | "iPad" | "iPod touch" | "Apple Watch";
  logicalWidth: number | null;
  logicalHeight: number | null;
  physicalWidth: number;
  physicalHeight: number;
  ppi: number;
  scaleFactor: number | null;
  screenDiagonal: string;
  aspectRatio: string;
  releaseDate: string;
}
