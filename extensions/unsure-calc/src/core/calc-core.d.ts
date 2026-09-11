export type Token = number | string;
export type UncertainValue = {
  mean: number;
  min: number;
  max: number;
  samples: number[] | null;
};

export type Quantiles = { p05: number; p95: number };

export type HistogramOptions = {
  bins?: number;
  width?: number;
  barChar?: string;
};

export const DEFAULT_SAMPLES: number;
export const DEFAULT_BINS: number;
export const DEFAULT_WIDTH: number;
export const DEFAULT_BAR: string;

export function tokenize(s: string): Token[];
export function shuntingYard(tokens: Token[]): Token[];
export function evalRpn(rpnQueue: Token[], sampleCount?: number): UncertainValue | null;
export function evaluateExpression(expression: string, sampleCount?: number): UncertainValue | null;
export function getQuantiles(samples: number[] | null): Quantiles;
export function formatNumber(num: number, padWidth?: number): string;
export function generateTextHistogram(samples: number[] | null, options?: HistogramOptions): string[];
