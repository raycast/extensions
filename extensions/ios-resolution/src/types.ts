export interface Device {
  id: string;
  name: string;
  family: "iPhone" | "iPad" | "iPod touch" | "Apple Watch";
  logicalWidth: number;
  logicalHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  ppi: number;
  scaleFactor: number;
  screenDiagonal: string;
  aspectRatio: string;
  releaseDate: string;
}
