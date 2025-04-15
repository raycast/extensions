export type Layout = ReadonlyArray<ReadonlyArray<number>>;

export type Frame = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type CellDimensions = Readonly<{
  cellWidth: number;
  cellHeight: number;
}>;
