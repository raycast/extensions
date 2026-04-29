function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export function normalInv(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function lgamma(x: number): number {
  // Lanczos g=5, n=6 — canonical Numerical Recipes constants.
  /* eslint-disable no-loss-of-precision */
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
  /* eslint-enable no-loss-of-precision */
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-10;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lgamma(a + b) -
      lgamma(a) -
      lgamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const tail = 0.5 * ibeta(df / 2, 0.5, x);
  return t >= 0 ? 1 - tail : tail;
}

export function tInv(p: number, df: number): number {
  let lo = -1e6;
  let hi = 1e6;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-9) break;
  }
  return (lo + hi) / 2;
}

export type TestKind = "oneProportion" | "twoProportion" | "means";

export type OneProportionInput = {
  successes: number;
  trials: number;
  nullProportion: number;
  confidenceLevel: number;
};

export type ProportionInput = {
  successesA: number;
  trialsA: number;
  successesB: number;
  trialsB: number;
  confidenceLevel: number;
};

export type MeansInput = {
  meanA: number;
  stdA: number;
  nA: number;
  meanB: number;
  stdB: number;
  nB: number;
  confidenceLevel: number;
};

export type Result = {
  kind: TestKind;
  diff: number;
  diffRelative: number | null;
  ciLow: number;
  ciHigh: number;
  pValue: number;
  statistic: number;
  statisticName: "z" | "t";
  df?: number;
  significant: boolean;
  alpha: number;
  rateA?: number;
  rateB?: number;
};

export function oneProportionTest(input: OneProportionInput): Result {
  const { successes, trials, nullProportion, confidenceLevel } = input;
  if (trials <= 0) throw new Error("Trial count must be greater than zero.");
  if (successes < 0) throw new Error("Successes cannot be negative.");
  if (successes > trials) throw new Error("Successes cannot exceed trials.");
  if (nullProportion <= 0 || nullProportion >= 1)
    throw new Error("Null proportion must be between 0 and 1.");
  if (confidenceLevel <= 0 || confidenceLevel >= 100)
    throw new Error("Confidence level must be between 0 and 100.");

  const pHat = successes / trials;
  const diff = pHat - nullProportion;

  const seNull = Math.sqrt((nullProportion * (1 - nullProportion)) / trials);
  const z = seNull === 0 ? 0 : diff / seNull;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  const alpha = 1 - confidenceLevel / 100;
  const zCrit = normalInv(1 - alpha / 2);
  const seWald = Math.sqrt((pHat * (1 - pHat)) / trials);
  const margin = zCrit * seWald;

  return {
    kind: "oneProportion",
    diff,
    diffRelative: nullProportion === 0 ? null : diff / nullProportion,
    ciLow: pHat - margin,
    ciHigh: pHat + margin,
    pValue,
    statistic: z,
    statisticName: "z",
    significant: pValue < alpha,
    alpha,
    rateA: pHat,
    rateB: nullProportion,
  };
}

export function twoProportionTest(input: ProportionInput): Result {
  const { successesA, trialsA, successesB, trialsB, confidenceLevel } = input;
  if (trialsA <= 0 || trialsB <= 0)
    throw new Error("Trial counts must be greater than zero.");
  if (successesA < 0 || successesB < 0)
    throw new Error("Successes cannot be negative.");
  if (successesA > trialsA || successesB > trialsB)
    throw new Error("Successes cannot exceed trials.");
  if (confidenceLevel <= 0 || confidenceLevel >= 100)
    throw new Error("Confidence level must be between 0 and 100.");

  const pA = successesA / trialsA;
  const pB = successesB / trialsB;
  const diff = pB - pA;

  const pooled = (successesA + successesB) / (trialsA + trialsB);
  const sePooled = Math.sqrt(
    pooled * (1 - pooled) * (1 / trialsA + 1 / trialsB),
  );
  const z = sePooled === 0 ? 0 : diff / sePooled;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  const alpha = 1 - confidenceLevel / 100;
  const zCrit = normalInv(1 - alpha / 2);
  const seUnpooled = Math.sqrt(
    (pA * (1 - pA)) / trialsA + (pB * (1 - pB)) / trialsB,
  );
  const margin = zCrit * seUnpooled;

  return {
    kind: "twoProportion",
    diff,
    diffRelative: pA === 0 ? null : diff / pA,
    ciLow: diff - margin,
    ciHigh: diff + margin,
    pValue,
    statistic: z,
    statisticName: "z",
    significant: pValue < alpha,
    alpha,
    rateA: pA,
    rateB: pB,
  };
}

export type ProportionSampleSizeInput = {
  baseline: number;
  mde: number;
  mdeType: "absolute" | "relative";
  alpha: number;
  power: number;
  twoSided: boolean;
};

export type MeansSampleSizeInput = {
  stdA: number;
  stdB: number;
  mde: number;
  alpha: number;
  power: number;
  twoSided: boolean;
};

export type OneProportionSampleSizeInput = {
  baseline: number;
  mde: number;
  mdeType: "absolute" | "relative";
  alpha: number;
  power: number;
  twoSided: boolean;
};

export type SampleSizeResult = {
  kind: TestKind;
  perGroup: number;
  total: number;
  p1?: number;
  p2?: number;
  absoluteMde: number;
  zAlpha: number;
  zBeta: number;
};

export function sampleSizeOneProportion(
  input: OneProportionSampleSizeInput,
): SampleSizeResult {
  const { baseline, mde, mdeType, alpha, power, twoSided } = input;
  if (baseline <= 0 || baseline >= 1)
    throw new Error("Baseline rate must be between 0 and 1.");
  if (alpha <= 0 || alpha >= 1)
    throw new Error("Alpha must be between 0 and 1.");
  if (power <= 0 || power >= 1)
    throw new Error("Power must be between 0 and 1.");
  if (mde === 0) throw new Error("MDE must be non-zero.");

  const p0 = baseline;
  const p1 = mdeType === "relative" ? baseline * (1 + mde) : baseline + mde;
  if (p1 <= 0 || p1 >= 1)
    throw new Error(
      "MDE produces an invalid alternative rate (must stay between 0 and 1).",
    );

  const delta = p1 - p0;
  const zAlpha = twoSided ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);
  const zBeta = normalInv(power);

  const term1 = zAlpha * Math.sqrt(p0 * (1 - p0));
  const term2 = zBeta * Math.sqrt(p1 * (1 - p1));
  const n = Math.pow(term1 + term2, 2) / Math.pow(delta, 2);
  const perGroup = Math.ceil(n);

  return {
    kind: "oneProportion",
    perGroup,
    total: perGroup,
    p1: p0,
    p2: p1,
    absoluteMde: delta,
    zAlpha,
    zBeta,
  };
}

export function sampleSizeProportion(
  input: ProportionSampleSizeInput,
): SampleSizeResult {
  const { baseline, mde, mdeType, alpha, power, twoSided } = input;
  if (baseline <= 0 || baseline >= 1)
    throw new Error("Baseline rate must be between 0 and 1.");
  if (alpha <= 0 || alpha >= 1)
    throw new Error("Alpha must be between 0 and 1.");
  if (power <= 0 || power >= 1)
    throw new Error("Power must be between 0 and 1.");
  if (mde === 0) throw new Error("MDE must be non-zero.");

  const p1 = baseline;
  const p2 = mdeType === "relative" ? baseline * (1 + mde) : baseline + mde;
  if (p2 <= 0 || p2 >= 1)
    throw new Error(
      "MDE produces an invalid treatment rate (must stay between 0 and 1).",
    );

  const delta = p2 - p1;
  const zAlpha = twoSided ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);
  const zBeta = normalInv(power);
  const pBar = (p1 + p2) / 2;

  const term1 = zAlpha * Math.sqrt(2 * pBar * (1 - pBar));
  const term2 = zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const n = Math.pow(term1 + term2, 2) / Math.pow(delta, 2);
  const perGroup = Math.ceil(n);

  return {
    kind: "twoProportion",
    perGroup,
    total: perGroup * 2,
    p1,
    p2,
    absoluteMde: delta,
    zAlpha,
    zBeta,
  };
}

export function sampleSizeMeans(input: MeansSampleSizeInput): SampleSizeResult {
  const { stdA, stdB, mde, alpha, power, twoSided } = input;
  if (stdA <= 0 || stdB <= 0)
    throw new Error("Standard deviations must be positive.");
  if (alpha <= 0 || alpha >= 1)
    throw new Error("Alpha must be between 0 and 1.");
  if (power <= 0 || power >= 1)
    throw new Error("Power must be between 0 and 1.");
  if (mde === 0) throw new Error("MDE must be non-zero.");

  const zAlpha = twoSided ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);
  const zBeta = normalInv(power);
  const n =
    (Math.pow(zAlpha + zBeta, 2) * (stdA * stdA + stdB * stdB)) / (mde * mde);
  const perGroup = Math.ceil(n);

  return {
    kind: "means",
    perGroup,
    total: perGroup * 2,
    absoluteMde: mde,
    zAlpha,
    zBeta,
  };
}

export function welchTTest(input: MeansInput): Result {
  const { meanA, stdA, nA, meanB, stdB, nB, confidenceLevel } = input;
  if (nA < 2 || nB < 2) throw new Error("Sample sizes must be at least 2.");
  if (stdA < 0 || stdB < 0)
    throw new Error("Standard deviations cannot be negative.");
  if (confidenceLevel <= 0 || confidenceLevel >= 100)
    throw new Error("Confidence level must be between 0 and 100.");

  const diff = meanB - meanA;
  const varA = stdA * stdA;
  const varB = stdB * stdB;
  const se = Math.sqrt(varA / nA + varB / nB);
  const t = se === 0 ? 0 : diff / se;

  const num = Math.pow(varA / nA + varB / nB, 2);
  const den =
    Math.pow(varA / nA, 2) / (nA - 1) + Math.pow(varB / nB, 2) / (nB - 1);
  const df = den === 0 ? nA + nB - 2 : num / den;

  const pValue = 2 * (1 - tCdf(Math.abs(t), df));
  const alpha = 1 - confidenceLevel / 100;
  const tCrit = tInv(1 - alpha / 2, df);
  const margin = tCrit * se;

  return {
    kind: "means",
    diff,
    diffRelative: meanA === 0 ? null : diff / meanA,
    ciLow: diff - margin,
    ciHigh: diff + margin,
    pValue,
    statistic: t,
    statisticName: "t",
    df,
    significant: pValue < alpha,
    alpha,
  };
}
