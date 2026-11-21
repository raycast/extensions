import { Member, MemberLoad, Model, Result, Station } from "./types";
type Mat = number[][];
const zeros = (n: number, m = n): Mat => Array.from({ length: n }, () => Array(m).fill(0));
const mv = (a: Mat, x: number[]) => a.map((r) => r.reduce((s, v, i) => s + v * x[i], 0));
/** Scaled pivoting with diagonal normalization; mechanisms are errors, never stabilized artificially. */
export function solve(a: Mat, b: number[]): number[] {
  if (!b.length) return [];
  const n = b.length,
    scale = a.map((r, i) => Math.sqrt(Math.abs(r[i])));
  if (scale.some((v) => !Number.isFinite(v) || v === 0))
    throw Error("Unstable model: an active degree of freedom has no stiffness. Check supports and releases.");
  const A = a.map((r, i) => r.map((v, j) => v / (scale[i] * scale[j]))),
    B = b.map((v, i) => v / scale[i]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    if (Math.abs(A[p][k]) < 1e-11)
      throw Error("Unstable or ill-conditioned model: check horizontal restraints, disconnected parts and hinges.");
    [A[k], A[p]] = [A[p], A[k]];
    [B[k], B[p]] = [B[p], B[k]];
    for (let i = k + 1; i < n; i++) {
      const f = A[i][k] / A[k][k];
      for (let j = k + 1; j < n; j++) A[i][j] -= f * A[k][j];
      B[i] -= f * B[k];
      A[i][k] = 0;
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--)
    x[i] = (B[i] - A[i].slice(i + 1).reduce((s, v, j) => s + v * x[i + j + 1], 0)) / A[i][i];
  return x.map((v, i) => v / scale[i]);
}
export function frameStiffness(E: number, A: number, I: number, L: number, shearRigidity = Infinity): Mat {
  const phi = (12 * E * I) / (shearRigidity * L * L),
    a = (E * A) / L,
    b = (12 * E * I) / ((1 + phi) * L ** 3),
    c = (b * L) / 2,
    d = ((4 + phi) * E * I) / ((1 + phi) * L),
    e = ((2 - phi) * E * I) / ((1 + phi) * L);
  return [
    [a, 0, 0, -a, 0, 0],
    [0, b, c, 0, -b, c],
    [0, c, d, 0, -c, e],
    [-a, 0, 0, a, 0, 0],
    [0, -b, -c, 0, b, -c],
    [0, c, e, 0, -c, d],
  ];
}
const gx = [-0.906179845938664, -0.538469310105683, 0, 0.538469310105683, 0.906179845938664],
  gw = [0.236926885056189, 0.478628670499366, 0.568888888888889, 0.478628670499366, 0.236926885056189];
function integrate(a: number, b: number, fn: (x: number) => number): number {
  if (b <= a) return 0;
  const h = (b - a) / 2,
    c = (a + b) / 2;
  return gx.reduce((s, v, i) => s + gw[i] * fn(c + h * v), 0) * h;
}
interface Load {
  kind: "udl" | "point" | "moment";
  qx: number;
  qz: number;
  qxEnd: number;
  qzEnd: number;
  a: number;
  b: number;
  moment: number;
}
interface Element {
  m: Member;
  L: number;
  c: number;
  s: number;
  indices: number[];
  T: Mat;
  k: Mat;
  f: number[];
  kc: Mat;
  fc: number[];
  release: number[];
  S: number;
  loads: Load[];
}
export function loadComponents(l: MemberLoad, c: number, s: number): [number, number] {
  let f = l.magnitude;
  if (l.kind === "udl" && l.basis === "projected") f *= Math.abs(c);
  if (l.direction === "localX") return [f, 0];
  if (l.direction === "localZ") return [0, f];
  if (l.direction === "globalX") return [f * c, -f * s];
  return [f * s, f * c];
}
function buildElement(model: Model, m: Member): Element {
  if (m.type !== "frame" && m.type !== "truss") throw Error(`${m.id}: member type must be frame or truss`);
  const ni = model.nodes.findIndex((n) => n.id === m.start),
    nj = model.nodes.findIndex((n) => n.id === m.end);
  if (ni < 0 || nj < 0 || ni === nj) throw Error(`${m.id}: invalid endpoints`);
  const start = model.nodes[ni],
    end = model.nodes[nj],
    L = Math.hypot(end.x - start.x, end.z - start.z);
  if (L < 1e-6) throw Error(`${m.id}: zero-length member`);
  if ([m.E, m.A, m.I].some((v) => !Number.isFinite(v) || v <= 0)) throw Error(`${m.id}: E, A and I must be positive`);
  const c = (end.x - start.x) / L,
    s = (end.z - start.z) / L;
  let S = Infinity;
  if (model.theory === "timoshenko" && m.type === "frame") {
    if (!(m.G! > 0 && m.shearArea! > 0)) throw Error(`${m.id}: Timoshenko needs positive G and effective shear area`);
    S = m.G! * m.shearArea!;
  }
  const k = m.type === "frame" ? frameStiffness(m.E, m.A, m.I, L, S) : zeros(6);
  if (m.type === "truss") {
    k[0][0] = k[3][3] = (m.E * m.A) / L;
    k[0][3] = k[3][0] = (-m.E * m.A) / L;
  }
  const T = [
    [c, s, 0, 0, 0, 0],
    [-s, c, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c, s, 0],
    [0, 0, 0, -s, c, 0],
    [0, 0, 0, 0, 0, 1],
  ];
  const loads: Load[] = model.memberLoads
    .filter((l) => l.member === m.id)
    .map((l) => {
      if (
        !["udl", "point", "moment"].includes(l.kind) ||
        !["globalX", "globalZ", "localX", "localZ"].includes(l.direction) ||
        !["member", "projected"].includes(l.basis)
      )
        throw Error(`${m.id}: unknown load kind, direction or basis`);
      if (m.type === "truss")
        throw Error(
          `${m.id}: true truss loads must act at joints. Use a frame/rafter member for loads between joints.`,
        );
      if (!Number.isFinite(l.magnitude) || (l.endMagnitude !== undefined && !Number.isFinite(l.endMagnitude)))
        throw Error("Load must be finite");
      const a = l.kind === "udl" ? (l.start ?? 0) : (l.position ?? L / 2),
        b = l.kind === "udl" ? (l.end ?? L) : a;
      if (a < 0 || b > L || a > b || !Number.isFinite(a + b)) throw Error(`${m.id}: load is outside the member`);
      const [qx, qz] = loadComponents(l, c, s),
        [qxEnd, qzEnd] = loadComponents({ ...l, magnitude: l.endMagnitude ?? l.magnitude }, c, s);
      return {
        kind: l.kind,
        qx,
        qz,
        qxEnd,
        qzEnd,
        a,
        b,
        moment: l.kind === "moment" ? l.magnitude : 0,
      };
    });
  const f = Array(6).fill(0);
  for (let j = 0; j < 6; j++) {
    const shape = (x: number) => ({
      u: (j === 0 ? 1 - x / L : 0) + (j === 3 ? x / L : 0),
      v:
        Number(j === 1) +
        Number(j === 2) * x -
        (k[2][j] * x * x) / (2 * m.E * m.I) +
        (k[1][j] * x ** 3) / (6 * m.E * m.I) -
        (k[1][j] * x) / S,
      theta: Number(j === 2) - (k[2][j] * x) / (m.E * m.I) + (k[1][j] * x * x) / (2 * m.E * m.I),
    });
    for (const l of loads) {
      if (l.kind === "point") {
        const h = shape(l.a);
        f[j] += l.qx * h.u + l.qz * h.v;
      } else if (l.kind === "moment") f[j] += l.moment * shape(l.a).theta;
      else
        f[j] += integrate(l.a, l.b, (x) => {
          const r = (x - l.a) / (l.b - l.a),
            h = shape(x);
          return (l.qx + (l.qxEnd - l.qx) * r) * h.u + (l.qz + (l.qzEnd - l.qz) * r) * h.v;
        });
    }
  }
  const release = m.type === "frame" ? [...(m.releaseStart ? [2] : []), ...(m.releaseEnd ? [5] : [])] : [];
  const kc = k.map((r) => [...r]),
    fc = [...f];
  if (release.length) {
    const rr = release.map((i) => release.map((j) => k[i][j])),
      fr = solve(
        rr,
        release.map((i) => f[i]),
      );
    for (let i = 0; i < 6; i++) {
      if (release.includes(i)) continue;
      fc[i] -= release.reduce((sum, r, j) => sum + k[i][r] * fr[j], 0);
      for (let j = 0; j < 6; j++) {
        if (release.includes(j)) continue;
        const sol = solve(
          rr,
          release.map((r) => k[r][j]),
        );
        kc[i][j] -= release.reduce((sum, r, t) => sum + k[i][r] * sol[t], 0);
      }
    }
    for (const r of release) {
      fc[r] = 0;
      for (let j = 0; j < 6; j++) kc[r][j] = kc[j][r] = 0;
    }
  }
  return {
    m,
    L,
    c,
    s,
    T,
    k,
    f,
    kc,
    fc,
    release,
    S,
    loads,
    indices: [ni * 3, ni * 3 + 1, ni * 3 + 2, nj * 3, nj * 3 + 1, nj * 3 + 2],
  };
}
function station(e: Element, d: number[], forces: number[], x: number): Station {
  let intX = 0,
    intX1 = 0,
    intZ = 0,
    intZ1 = 0,
    intZ2 = 0,
    intZ3 = 0,
    mom0 = 0,
    mom1 = 0,
    mom2 = 0;
  for (const l of e.loads) {
    if (l.kind === "udl") {
      const b = Math.min(x, l.b);
      const q = (v: number, vEnd: number, t: number) => v + ((vEnd - v) * (t - l.a)) / (l.b - l.a);
      intX += integrate(l.a, b, (t) => q(l.qx, l.qxEnd, t));
      intX1 += integrate(l.a, b, (t) => q(l.qx, l.qxEnd, t) * (x - t));
      intZ += integrate(l.a, b, (t) => q(l.qz, l.qzEnd, t));
      intZ1 += integrate(l.a, b, (t) => q(l.qz, l.qzEnd, t) * (x - t));
      intZ2 += integrate(l.a, b, (t) => (q(l.qz, l.qzEnd, t) * (x - t) ** 2) / 2);
      intZ3 += integrate(l.a, b, (t) => (q(l.qz, l.qzEnd, t) * (x - t) ** 3) / 6);
    } else if (x >= l.a) {
      if (l.kind === "moment") {
        mom0 += l.moment;
        mom1 += l.moment * (x - l.a);
        mom2 += (l.moment * (x - l.a) ** 2) / 2;
      } else {
        intX += l.qx;
        intX1 += l.qx * (x - l.a);
        intZ += l.qz;
        intZ1 += l.qz * (x - l.a);
        intZ2 += (l.qz * (x - l.a) ** 2) / 2;
        intZ3 += (l.qz * (x - l.a) ** 3) / 6;
      }
    }
  }
  const N = -forces[0] - intX,
    V = forces[1] + intZ,
    M = -forces[2] + forces[1] * x + intZ1 - mom0;
  const u = d[0] + (-forces[0] * x - intX1) / (e.m.E * e.m.A),
    rotation = d[2] + (-forces[2] * x + (forces[1] * x * x) / 2 + intZ2 - mom1) / (e.m.E * e.m.I);
  const v =
    d[1] +
    d[2] * x +
    ((-forces[2] * x * x) / 2 + (forces[1] * x ** 3) / 6 + intZ3 - mom2) / (e.m.E * e.m.I) -
    (forces[1] * x + intZ1) / e.S;
  return {
    x,
    N,
    V: e.m.type === "truss" ? 0 : V,
    M: e.m.type === "truss" ? 0 : M,
    u,
    v: e.m.type === "truss" ? d[1] + ((d[4] - d[1]) * x) / e.L : v,
    rotation,
    globalX: 0,
    globalZ: 0,
  };
}
export function analyze(model: Model, samplePositions: Record<string, number[]> = {}): Result {
  if (!model.nodes.length || !model.members.length) throw Error("Add at least two nodes and a member");
  if (model.theory !== "euler" && model.theory !== "timoshenko") throw Error("Beam theory must be euler or timoshenko");
  if (
    new Set(model.nodes.map((n) => n.id)).size !== model.nodes.length ||
    new Set(model.members.map((m) => m.id)).size !== model.members.length
  )
    throw Error("Node and member IDs must be unique");
  for (const n of model.nodes) {
    if (!Number.isFinite(n.x + n.z)) throw Error(`${n.id}: coordinates must be finite`);
    if (n.restraints.length !== 3 || n.restraints.some((v) => typeof v !== "boolean"))
      throw Error(`${n.id}: restraints must be [X, Z, rotation] booleans`);
  }
  const elements = model.members.map((m) => buildElement(model, m)),
    nd = model.nodes.length * 3,
    K = zeros(nd),
    F = Array(nd).fill(0);
  for (const l of model.memberLoads)
    if (!model.members.some((m) => m.id === l.member)) throw Error(`Unknown loaded member ${l.member}`);
  for (const e of elements) {
    for (let i = 0; i < 6; i++) {
      F[e.indices[i]] += e.T.reduce((sum, r, j) => sum + r[i] * e.fc[j], 0);
      for (let j = 0; j < 6; j++) {
        let v = 0;
        for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) v += e.T[a][i] * e.kc[a][b] * e.T[b][j];
        K[e.indices[i]][e.indices[j]] += v;
      }
    }
  }
  for (const l of model.nodalLoads) {
    const i = model.nodes.findIndex((n) => n.id === l.node);
    if (i < 0) throw Error(`Unknown loaded node ${l.node}`);
    [l.fx, l.fz, l.moment].forEach((v, j) => {
      if (!Number.isFinite(v)) throw Error("Nonfinite nodal load");
      F[i * 3 + j] += v;
    });
  }
  const fixed = model.nodes.flatMap((n) => n.restraints),
    active: number[] = [];
  for (let i = 0; i < nd; i++)
    if (!fixed[i]) {
      if (K[i][i] === 0) {
        if (i % 3 === 2 && Math.abs(F[i]) < 1e-9) continue;
        throw Error(
          `Unrestrained degree of freedom at ${model.nodes[Math.floor(i / 3)].id}. Check supports and connections.`,
        );
      }
      active.push(i);
    }
  const solution = solve(
      active.map((i) => active.map((j) => K[i][j])),
      active.map((i) => F[i]),
    ),
    D = Array(nd).fill(0);
  active.forEach((i, j) => (D[i] = solution[j]));
  const R = mv(K, D).map((v, i) => v - F[i]),
    displacements: Record<string, number[]> = {},
    reactions: Record<string, number[]> = {};
  model.nodes.forEach((n, i) => {
    displacements[n.id] = D.slice(i * 3, i * 3 + 3);
    reactions[n.id] = R.slice(i * 3, i * 3 + 3).map((v, j) => (n.restraints[j] ? v : 0));
  });
  const members = elements.map((e) => {
    const d = mv(
      e.T,
      e.indices.map((i) => D[i]),
    );
    if (e.release.length) {
      const rr = e.release.map((i) => e.release.map((j) => e.k[i][j]));
      const v = solve(
        rr,
        e.release.map((i) => e.f[i] - e.k[i].reduce((s, k, j) => s + (e.release.includes(j) ? 0 : k * d[j]), 0)),
      );
      e.release.forEach((i, j) => (d[i] = v[j]));
    }
    const forces = mv(e.k, d).map((v, i) => v - e.f[i]);
    const xs = new Set<number>([0, e.L]);
    for (const x of samplePositions[e.m.id] || []) {
      if (Number.isFinite(x) && x >= 0 && x <= e.L) xs.add(x);
    }
    for (let i = 1; i < 80; i++) xs.add((e.L * i) / 80);
    for (const l of e.loads) {
      xs.add(l.a);
      xs.add(l.b);
      if (l.kind !== "udl" && l.a > 0) xs.add(Math.max(0, l.a - e.L * 1e-9));
    }
    // Find critical moment and displacement locations between load discontinuities.
    const breakpoints = [...new Set([0, e.L, ...e.loads.flatMap((l) => [l.a, l.b])])].sort((a, b) => a - b);
    if (e.m.type === "frame")
      for (let b = 0; b < breakpoints.length - 1; b++) {
        const aa = breakpoints[b],
          bb = breakpoints[b + 1];
        for (const fn of [(s: Station) => s.V, (s: Station) => s.rotation - s.V / e.S])
          for (let j = 0; j < 32; j++) {
            let a = aa + ((bb - aa) * j) / 32 + (j === 0 ? e.L * 1e-12 : 0),
              z = aa + ((bb - aa) * (j + 1)) / 32 - (j === 31 ? e.L * 1e-12 : 0);
            let fa = fn(station(e, d, forces, a)),
              fz = fn(station(e, d, forces, z));
            if (fa * fz <= 0 && (fa !== 0 || fz !== 0)) {
              for (let it = 0; it < 42; it++) {
                const mid = (a + z) / 2,
                  fm = fn(station(e, d, forces, mid));
                if (fa * fm <= 0) {
                  z = mid;
                  fz = fm;
                } else {
                  a = mid;
                  fa = fm;
                }
              }
              xs.add((a + z) / 2);
            }
          }
      }
    const stations = [...xs]
      .sort((a, b) => a - b)
      .map((x) => {
        const p = station(e, d, forces, x);
        p.globalX = e.c * p.u - e.s * p.v;
        p.globalZ = e.s * p.u + e.c * p.v;
        return p;
      });
    const last = stations[stations.length - 1];
    if (
      Math.abs(last.u - d[3]) > 1e-5 * Math.max(1, Math.abs(d[3])) ||
      Math.abs(last.v - d[4]) > 1e-5 * Math.max(1, Math.abs(d[4]))
    )
      throw Error(`${e.m.id}: displacement recovery failed its compatibility check`);
    return {
      id: e.m.id,
      length: e.L,
      angle: Math.atan2(e.s, e.c),
      stations,
      endForces: forces,
    };
  });
  const residual = Math.max(0, ...active.map((i) => Math.abs(R[i]))),
    totals = { fx: 0, fz: 0, moment: 0 };
  model.nodes.forEach((n, i) => {
    totals.fx += F[i * 3];
    totals.fz += F[i * 3 + 1];
    totals.moment += F[i * 3 + 2] + n.x * F[i * 3 + 1] - n.z * F[i * 3];
  });
  return {
    displacements,
    reactions,
    members,
    residual,
    totals,
    warnings:
      model.theory === "euler"
        ? ["Linear elastic, small displacement; shear deformation excluded."]
        : ["Linear elastic Timoshenko; supplied effective shear area governs shear deformation."],
  };
}
