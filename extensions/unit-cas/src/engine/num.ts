// Numbers are either exact rationals (bigint numerator/denominator) or IEEE floats,
// mirroring the Nspire's exact/approximate split.

export type Num = { e: true; n: bigint; d: bigint } | { e: false; v: number };

export function bgcd(a: bigint, b: bigint): bigint {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) [a, b] = [b, a % b];
  return a;
}

export function rat(n: bigint, d: bigint = 1n): Num {
  if (d === 0n) return fl(n === 0n ? NaN : n > 0n ? Infinity : -Infinity);
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = bgcd(n, d);
  return g > 1n ? { e: true, n: n / g, d: d / g } : { e: true, n, d };
}

export function int(n: number | bigint): Num {
  return rat(BigInt(n));
}

export function fl(v: number): Num {
  return { e: false, v };
}

export const ZERO = int(0);
export const ONE = int(1);

export function toF(a: Num): number {
  if (!a.e) return a.v;
  // Avoid precision loss for huge numerators/denominators.
  const n = a.n,
    d = a.d;
  const nf = Number(n),
    df = Number(d);
  if (Number.isFinite(nf) && Number.isFinite(df)) return nf / df;
  const shift = BigInt(Math.max(n.toString().length, d.toString().length) - 300);
  const s = 10n ** (shift > 0n ? shift : 0n);
  return Number(n / s) / Number(d / s);
}

export function isInt(a: Num): boolean {
  return a.e ? a.d === 1n : Number.isInteger(a.v);
}

export function isZero(a: Num): boolean {
  return a.e ? a.n === 0n : a.v === 0;
}

export function sign(a: Num): number {
  return a.e ? (a.n > 0n ? 1 : a.n < 0n ? -1 : 0) : Math.sign(a.v);
}

export function isNaNum(a: Num): boolean {
  return !a.e && Number.isNaN(a.v);
}

export function add(a: Num, b: Num): Num {
  if (a.e && b.e) return rat(a.n * b.d + b.n * a.d, a.d * b.d);
  return fl(toF(a) + toF(b));
}

export function sub(a: Num, b: Num): Num {
  return add(a, neg(b));
}

export function neg(a: Num): Num {
  return a.e ? { e: true, n: -a.n, d: a.d } : fl(-a.v);
}

export function mul(a: Num, b: Num): Num {
  if (a.e && b.e) return rat(a.n * b.n, a.d * b.d);
  return fl(toF(a) * toF(b));
}

export function div(a: Num, b: Num): Num {
  if (a.e && b.e) {
    if (b.n === 0n) return fl(NaN);
    return rat(a.n * b.d, a.d * b.n);
  }
  const bv = toF(b);
  if (bv === 0) return fl(NaN);
  return fl(toF(a) / bv);
}

export function cmp(a: Num, b: Num): number {
  if (a.e && b.e) {
    const l = a.n * b.d,
      r = b.n * a.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  const x = toF(a),
    y = toF(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

export function approxEq(a: Num, b: Num): boolean {
  if (a.e && b.e) return a.n === b.n && a.d === b.d;
  const x = toF(a),
    y = toF(b);
  return Math.abs(x - y) <= 1e-12 * Math.max(1, Math.abs(x), Math.abs(y));
}

/** Integer k-th root of a non-negative bigint if exact, else null. */
export function iroot(n: bigint, k: number): bigint | null {
  if (n < 0n) return null;
  if (n < 2n) return n;
  const kb = BigInt(k);
  let x = BigInt(Math.round(Math.pow(Number(n), 1 / k)));
  if (!Number.isFinite(Number(n))) {
    // Newton iteration for very large numbers.
    x = 1n << BigInt(Math.ceil(n.toString(2).length / k));
    for (;;) {
      const y = ((kb - 1n) * x + n / x ** (kb - 1n)) / kb;
      if (y >= x) break;
      x = y;
    }
  }
  for (const c of [x - 1n, x, x + 1n]) if (c >= 0n && c ** kb === n) return c;
  return null;
}

export function pow(a: Num, b: Num): Num {
  if (a.e && b.e) {
    if (b.d === 1n) {
      const k = b.n;
      if (k === 0n) return ONE;
      if (
        k > -2000n &&
        k < 2000n &&
        (a.n.toString().length + a.d.toString().length) * Number(k < 0n ? -k : k) < 20000
      ) {
        if (k > 0n) return rat(a.n ** k, a.d ** k);
        if (a.n === 0n) return fl(NaN);
        return rat(a.d ** -k, a.n ** -k);
      }
    } else if (b.d <= 64n) {
      // Rational exponent p/q: exact when the q-th root is exact.
      const q = Number(b.d);
      let sgn = 1n;
      let n = a.n;
      if (n < 0n) {
        if (q % 2 === 0) return fl(NaN);
        sgn = -1n;
        n = -n;
      }
      const rn = iroot(n, q),
        rd = iroot(a.d, q);
      if (rn !== null && rd !== null) return pow(rat(sgn * rn, rd), rat(b.n));
    }
  }
  const x = toF(a),
    y = toF(b);
  if (x < 0 && !Number.isInteger(y)) {
    // Real root of a negative number for odd denominators (Nspire real mode).
    const r = b.e ? b : toRat(y, 1000);
    if (r && r.e && r.d % 2n === 1n) {
      const mag = Math.pow(-x, y);
      return fl(r.n % 2n === 0n ? mag : -mag);
    }
    return fl(NaN);
  }
  return fl(Math.pow(x, y));
}

/** Best rational approximation with denominator <= maxDen, if it matches to ~1e-12. */
export function toRat(x: number, maxDen: number, tol = 1e-12): Num | null {
  if (!Number.isFinite(x)) return null;
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return int(x);
  let h0 = 0,
    h1 = 1,
    k0 = 1,
    k1 = 0;
  let v = Math.abs(x);
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(v);
    const h2 = a * h1 + h0,
      k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    [h0, h1, k0, k1] = [h1, h2, k1, k2];
    if (Math.abs(h1 / k1 - Math.abs(x)) <= tol * Math.abs(x)) {
      return rat(BigInt(x < 0 ? -h1 : h1), BigInt(k1));
    }
    const frac = v - a;
    if (frac < 1e-15) break;
    v = 1 / frac;
  }
  return null;
}

/** Parse a decimal literal ("1.5", "2E-3", "7") as an exact rational. */
export function parseDecimal(s: string): Num {
  const m = /^([0-9]*)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]+))?$/.exec(s);
  if (!m) return fl(Number(s));
  const ip = m[1] || "0",
    fp = m[2] || "";
  const exp = (m[3] ? parseInt(m[3], 10) : 0) - fp.length;
  const n = BigInt(ip + fp);
  return exp >= 0 ? rat(n * 10n ** BigInt(exp)) : rat(n, 10n ** BigInt(-exp));
}

export function floor(a: Num): Num {
  if (a.e) {
    let q = a.n / a.d;
    if (a.n < 0n && q * a.d !== a.n) q -= 1n;
    return rat(q);
  }
  return fl(Math.floor(a.v));
}

export function toFloat(a: Num): Num {
  return a.e ? fl(toF(a)) : a;
}
