export type System = "imperial" | "metric";
export type Unit = "in" | "mm";
export type Series = "coarse" | "fine";

export interface Thread {
  designation: string;
  series: Series;
  tpi?: number;
  pitch?: number;
  tapDrill: number;
  tapDrillName?: string;
}

export interface Hole {
  dia: number;
  name?: string;
}

export interface Counterbore {
  dia: number;
  depth: number;
  headDia: number;
  headHeight: number;
}

export interface Fastener {
  system: System;
  unit: Unit;
  size: string;
  sizeNumber: number;
  majorDia: number;
  threads: Thread[];
  clearance: { close: Hole; normal: Hole; loose: Hole };
  counterbore?: Counterbore;
}
