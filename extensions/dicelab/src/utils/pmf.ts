// PMF data processing utilities ported from web/src/rendering/pmf_renderer.js

export interface PMFBin {
  probability: number;
  label: string;
  rawProbability?: unknown;
  rawValue?: unknown;
}

export interface PMFData {
  mean: number | null;
  variance: number | null;
  stdDev: number | null;
  iqr: number | null;
  quantiles: Array<{ quantile: number; value: number }>;
  bins: PMFBin[];
  maxProbability: number;
  raw?: unknown;
}

export interface NormalizedPMFPayload {
  pmfs: PMFData[];
}

export function coerceNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeProbability(probability: unknown): number {
  const parsed = coerceNumber(probability);
  if (parsed === null || Number.isNaN(parsed)) {
    return 0;
  }
  if (parsed < 0) {
    return 0;
  }
  return parsed;
}

export function normalizeBin(bin: unknown): PMFBin {
  const binObj = bin as Record<string, unknown>;
  const normalizedProbability = normalizeProbability(binObj?.probability);
  const value = binObj?.value;
  const numericValue = coerceNumber(value);
  return {
    probability: normalizedProbability,
    label: numericValue !== null ? String(numericValue) : String(value ?? "?"),
    rawProbability: binObj?.probability,
    rawValue: value,
  };
}

export function normalizePmfPayload(payload: unknown): NormalizedPMFPayload {
  const payloadObj = payload as Record<string, unknown>;
  const pmfs = Array.isArray(payloadObj?.pmfs) ? payloadObj.pmfs : [];
  const normalizedPmfs = pmfs.map((pmf: unknown) => {
    const pmfObj = pmf as Record<string, unknown>;
    const bins = Array.isArray(pmfObj?.bins) ? pmfObj.bins : [];
    const normalizedBins = bins.map((bin) => normalizeBin(bin));
    const maxProbability = normalizedBins.reduce(
      (acc, bin) => Math.max(acc, bin.probability),
      0,
    );
    const mean = coerceNumber(pmfObj?.mean);
    const sanitizedMean = mean === null ? null : Number(mean.toFixed(4));
    const variance = coerceNumber(pmfObj?.variance);
    const sanitizedVariance =
      variance === null ? null : Number(variance.toFixed(4));
    const stdDev = coerceNumber(pmfObj?.std_dev ?? pmfObj?.stdDev);
    const sanitizedStdDev = stdDev === null ? null : Number(stdDev.toFixed(4));
    const interquartileRange = coerceNumber(
      pmfObj?.interquartile_range ?? pmfObj?.iqr ?? pmfObj?.interquartileRange,
    );
    const sanitizedIqr =
      interquartileRange === null
        ? null
        : Number(Math.max(interquartileRange, 0).toFixed(4));
    const quantiles = Array.isArray(pmfObj?.quantiles)
      ? (pmfObj.quantiles as unknown[])
          .map((q) => {
            const qObj = q as Record<string, unknown>;
            const quantile = coerceNumber(qObj?.quantile);
            const value = coerceNumber(qObj?.value);
            if (quantile === null || value === null) return null;
            return {
              quantile: Number(quantile.toFixed(4)),
              value: Number(value.toFixed(4)),
            };
          })
          .filter((q): q is { quantile: number; value: number } => q !== null)
      : [];
    return {
      mean: sanitizedMean,
      variance: sanitizedVariance,
      stdDev: sanitizedStdDev,
      iqr: sanitizedIqr,
      quantiles,
      bins: normalizedBins,
      maxProbability: Number.isFinite(maxProbability) ? maxProbability : 0,
      raw: pmf,
    };
  });

  return { pmfs: normalizedPmfs };
}

export function summarizePmfPayload(payload: unknown): string {
  const { pmfs } = normalizePmfPayload(payload);
  if (!pmfs.length) return "PMF available";
  const first = pmfs[0];
  const values = first.bins
    .map((bin) => coerceNumber(bin.rawValue))
    .filter((val): val is number => val !== null);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const mean =
    first.mean === null || first.mean === undefined
      ? "?"
      : first.mean.toFixed(2);
  const stdDev =
    first.stdDev === null || first.stdDev === undefined
      ? "?"
      : first.stdDev.toFixed(2);
  const variance =
    first.variance === null || first.variance === undefined
      ? "?"
      : first.variance.toFixed(2);
  const iqr =
    first.iqr === null || first.iqr === undefined ? "?" : first.iqr.toFixed(2);
  const quantileText = first.quantiles.length
    ? first.quantiles
        .map((q) => `q${(q.quantile * 100).toFixed(0)} ${q.value.toFixed(2)}`)
        .join(", ")
    : null;

  const rangeText = `${min ?? "?"}..${max ?? "?"}`;
  const parts = [
    `PMF mean ${mean}`,
    `std ${stdDev}`,
    `var ${variance}`,
    `IQR ${iqr}`,
    `range ${rangeText}`,
  ];
  if (quantileText) {
    parts.push(quantileText);
  }

  return parts.join("; ");
}
