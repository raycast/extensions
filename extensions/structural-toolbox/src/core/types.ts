/** Internal analysis units: N, mm, MPa, radians; public inputs are converted at the boundary. */
export type RecordRow = Record<string, string>;
export interface Material {
  id: string;
  family: string;
  E: number | null;
  G: number | null;
  density: number | null;
  status: string;
  source: string;
  raw: RecordRow;
}
export type Shape = "rectangle" | "circle" | "rhs" | "shs" | "chs" | "i" | "t" | "channel" | "angle";
export interface Section {
  id: string;
  family: string;
  shape: Shape;
  b: number;
  h: number;
  t: number;
  tw: number;
  tf: number;
  d: number;
  A: number;
  Iy: number;
  Iz: number;
  Iyz: number;
  cy: number;
  cz: number;
  Wy: number;
  Wz: number;
  ry: number;
  rz: number;
  Imajor: number;
  Iminor: number;
  principalAngle: number;
  J?: number;
  Wply?: number;
  Wplz?: number;
  Ay?: number;
  Az?: number;
  Iw?: number;
  mass?: number;
  source: string;
  notes: string;
  raw: RecordRow;
}
export interface Node {
  id: string;
  x: number;
  z: number;
  restraints: [boolean, boolean, boolean];
}
export interface Member {
  section?: Section;
  bendingAxis?: "y" | "z";
  id: string;
  start: string;
  end: string;
  type: "frame" | "truss";
  E: number;
  G?: number;
  A: number;
  I: number;
  shearArea?: number;
  releaseStart?: boolean;
  releaseEnd?: boolean;
}
export interface NodalLoad {
  node: string;
  fx: number;
  fz: number;
  moment: number;
}
export interface MemberLoad {
  member: string;
  kind: "udl" | "point" | "moment";
  magnitude: number;
  direction: "globalX" | "globalZ" | "localX" | "localZ";
  basis: "member" | "projected";
  start?: number;
  end?: number;
  position?: number;
  endMagnitude?: number;
}
export interface Model {
  nodes: Node[];
  members: Member[];
  nodalLoads: NodalLoad[];
  memberLoads: MemberLoad[];
  theory: "euler" | "timoshenko";
}
export interface Station {
  x: number;
  N: number;
  V: number;
  M: number;
  u: number;
  v: number;
  globalX: number;
  globalZ: number;
  rotation: number;
}
export interface MemberResult {
  id: string;
  length: number;
  angle: number;
  stations: Station[];
  endForces: number[];
}
export interface Result {
  deformation?: {
    member: string;
    x: number;
    bending: number;
    increment: number;
    total: number;
    description: string;
    curves: {
      member: string;
      stations: {
        x: number;
        bending: number;
        increment: number;
        total: number;
      }[];
    }[];
  };
  displacements: Record<string, number[]>;
  reactions: Record<string, number[]>;
  members: MemberResult[];
  residual: number;
  warnings: string[];
  totals: { fx: number; fz: number; moment: number };
}
