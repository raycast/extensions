// Shared probabilistic calculator core logic (browser, Raycast, and tests)
// Exposes tokenize, shuntingYard, evalRpn, evaluateExpression, getQuantiles, formatNumber, generateTextHistogram

const DEFAULT_SAMPLES = 10000;
const DEFAULT_BINS = 20;
const DEFAULT_WIDTH = 40;
const DEFAULT_BAR = "█";

let spareRandom = null;

// Gaussian (normal) RNG using the Box-Muller transform; returns N(mean, stdDev)
function gaussianRandom(mean, stdDev) {
  let u, v, s;
  if (spareRandom !== null) {
    const temp = spareRandom;
    spareRandom = null;
    return mean + stdDev * temp;
  }
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt((-2.0 * Math.log(s)) / s);
  spareRandom = v * mul;
  return mean + stdDev * (u * mul);
}

// Generate draws from N(mean, stdDev); fast path for zero-width ranges
function generateSamples(mean, stdDev, sampleCount) {
  if (!sampleCount || sampleCount <= 0) return [];
  if (stdDev === 0) {
    return Array(sampleCount).fill(mean);
  }
  const samples = [];
  for (let i = 0; i < sampleCount; i++) {
    samples.push(gaussianRandom(mean, stdDev));
  }
  return samples;
}

// --- Tokenizer ---
// Tokenize an expression string into numbers/operators; minus stays separate for unary detection
function tokenize(s) {
  const tokens = [];
  const NUMBER_REGEX = /^[0-9]+(\.[0-9]+)?/;
  const OPERATOR_REGEX = /^[+\-*^/~()]/;
  const WHITESPACE_REGEX = /^\s+/;
  let remaining = s.trim();
  const originalString = s;
  while (remaining.length > 0) {
    let match;
    match = remaining.match(WHITESPACE_REGEX);
    if (match) {
      remaining = remaining.substring(match[0].length);
      continue;
    }
    match = remaining.match(NUMBER_REGEX);
    if (match) {
      tokens.push(parseFloat(match[0]));
      remaining = remaining.substring(match[0].length);
      continue;
    }
    match = remaining.match(OPERATOR_REGEX);
    if (match) {
      tokens.push(match[0]);
      remaining = remaining.substring(match[0].length);
      continue;
    }
    throw new Error(
      `Syntax Error: Cannot parse near '${remaining.substring(0, 10)}...' in expression '${originalString}'`,
    );
  }
  return tokens;
}

// Convert tokens to Reverse Polish Notation (handles unary minus via synthetic NEG token)
function shuntingYard(tokens) {
  let prevToken = null;
  const outputQueue = [];
  const operatorStack = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3, "~": 4, NEG: 5 };
  const associativity = {
    "+": "L",
    "-": "L",
    "*": "L",
    "/": "L",
    "^": "L",
    "~": "R",
    NEG: "R",
  };
  for (const token of tokens) {
    if (token === "-") {
      if (prevToken == null || prevToken === "(" || (typeof prevToken !== "number" && prevToken !== ")")) {
        operatorStack.push("NEG");
        prevToken = token;
        continue;
      }
    }
    if (typeof token === "number") {
      outputQueue.push(token);
      prevToken = token;
    } else if (token === "(") {
      operatorStack.push(token);
      prevToken = token;
    } else if (token === ")") {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== "(") {
        outputQueue.push(operatorStack.pop());
      }
      if (operatorStack.length === 0) throw new Error("Mismatched parentheses: Found ')' without matching '('");
      operatorStack.pop();
    } else if (precedence[token]) {
      const op1 = token;
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== "(" &&
        (precedence[operatorStack[operatorStack.length - 1]] > precedence[op1] ||
          (precedence[operatorStack[operatorStack.length - 1]] === precedence[op1] && associativity[op1] === "L"))
      ) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(op1);
      prevToken = token;
    } else {
      throw new Error(`Unknown token: ${token}`);
    }
  }
  while (operatorStack.length > 0) {
    const op = operatorStack.pop();
    if (op === "(") throw new Error("Mismatched parentheses: Found '(' without matching ')'");
    outputQueue.push(op);
  }
  return outputQueue;
}

// Helper for operating on sample arrays
function operateSamples(samplesA, samplesB, operation, sampleCount) {
  const aIsArray = Array.isArray(samplesA);
  const bIsArray = Array.isArray(samplesB);
  if (!aIsArray && !bIsArray) return null; // keep exact arithmetic if both operands are exact numbers

  const N = sampleCount;
  const resultSamples = Array(N);

  for (let i = 0; i < N; i++) {
    const a = aIsArray ? samplesA[i] : samplesA;
    const b = bIsArray ? samplesB[i] : samplesB;

    switch (operation) {
      case "+":
        resultSamples[i] = a + b;
        break;
      case "-":
        resultSamples[i] = a - b;
        break;
      case "*":
        resultSamples[i] = a * b;
        break;
      case "/":
        resultSamples[i] = b === 0 ? NaN : a / b;
        break;
      case "^":
        resultSamples[i] = Math.pow(a, b);
        break;
      default:
        throw new Error(`Unknown sample operation: ${operation}`);
    }
  }
  return resultSamples;
}

// Evaluate RPN queue into an UncertainValue (mean/min/max/samples), handling NEG and '~'
function evalRpn(rpnQueue, sampleCount = DEFAULT_SAMPLES) {
  const stack = [];

  const createNumberValue = (num) => ({
    mean: num,
    min: num,
    max: num,
    samples: null,
  });

  for (const token of rpnQueue) {
    if (token === "NEG") {
      if (stack.length < 1) throw new Error("Not enough operands for unary minus");
      const a = stack.pop();
      const nmin = Math.min(-a.max, -a.min);
      const nmax = Math.max(-a.max, -a.min);
      stack.push({
        mean: -a.mean,
        min: nmin,
        max: nmax,
        samples: a.samples ? a.samples.map((x) => -x) : null,
      });
      continue;
    }

    if (typeof token === "number") {
      stack.push(createNumberValue(token));
    } else if (token === "~") {
      if (stack.length < 2) throw new Error("Not enough operands for '~'");
      const uvB = stack.pop();
      const uvA = stack.pop();

      if (
        uvA.samples !== null ||
        uvB.samples !== null ||
        typeof uvA.mean !== "number" ||
        typeof uvB.mean !== "number"
      ) {
        throw new Error("Operands for '~' must be exact numbers (e.g., 100~200, not (5~10)~200)");
      }
      const a = uvA.mean;
      const b = uvB.mean;

      const mean = (a + b) / 2.0;
      const stdDev = Math.abs(b - a) / 3.28970725;
      const samples = generateSamples(mean, stdDev, sampleCount);

      stack.push({
        mean: mean,
        min: Math.min(a, b),
        max: Math.max(a, b),
        samples: samples,
      });
    } else if ("+-*/^".includes(token)) {
      if (stack.length < 2) throw new Error(`Not enough operands for '${token}'`);
      const uvB = stack.pop();
      const uvA = stack.pop();

      let newMean, newMin, newMax;

      switch (token) {
        case "+":
          newMean = uvA.mean + uvB.mean;
          break;
        case "-":
          newMean = uvA.mean - uvB.mean;
          break;
        case "*":
          newMean = uvA.mean * uvB.mean;
          break;
        case "/":
          newMean = uvB.mean === 0 ? NaN : uvA.mean / uvB.mean;
          break;
        case "^":
          newMean = Math.pow(uvA.mean, uvB.mean);
          break;
      }

      const aMin = uvA.min,
        aMax = uvA.max;
      const bMin = uvB.min,
        bMax = uvB.max;

      switch (token) {
        case "+":
          newMin = aMin + bMin;
          newMax = aMax + bMax;
          break;
        case "-":
          newMin = aMin - bMax;
          newMax = aMax - bMin;
          break;
        case "*": {
          const prods = [aMin * bMin, aMin * bMax, aMax * bMin, aMax * bMax];
          newMin = Math.min(...prods);
          newMax = Math.max(...prods);
          break;
        }
        case "^": {
          const powers = [aMin ** bMin, aMin ** bMax, aMax ** bMin, aMax ** bMax];
          newMin = Math.min(...powers);
          newMax = Math.max(...powers);
          break;
        }
        case "/":
          if (bMin <= 0 && bMax >= 0) {
            if (bMin === 0 && bMax === 0) {
              newMin = NaN;
              newMax = NaN;
              newMean = NaN;
            } else {
              if (aMin === 0 && aMax === 0) {
                newMin = 0;
                newMax = 0;
              } else {
                newMin = -Infinity;
                newMax = Infinity;
              }
            }
          } else {
            const quots = [aMin / bMin, aMin / bMax, aMax / bMin, aMax / bMax];
            newMin = Math.min(...quots);
            newMax = Math.max(...quots);
          }
          break;
      }

      const samplesA = uvA.samples ?? uvA.mean;
      const samplesB = uvB.samples ?? uvB.mean;
      const newSamples = operateSamples(samplesA, samplesB, token, sampleCount);

      stack.push({
        mean: newMean,
        min: newMin,
        max: newMax,
        samples: newSamples,
      });
    } else {
      throw new Error(`Internal Error: Unknown RPN token: ${token}`);
    }
  }

  if (stack.length === 0) return null;
  if (stack.length > 1) throw new Error("Invalid expression: Operands left over");
  return stack[0];
}

// Convenience: run full pipeline (tokenize -> RPN -> evaluate) and return UncertainValue
function evaluateExpression(expression, sampleCount = DEFAULT_SAMPLES) {
  const tokens = tokenize(expression);
  const rpn = shuntingYard(tokens);
  return evalRpn(rpn, sampleCount);
}

// Return 5th and 95th percentiles from sample array, ignoring NaN/Inf
function getQuantiles(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return { p05: NaN, p95: NaN };
  const validSamples = samples.filter((n) => !isNaN(n) && isFinite(n));
  if (validSamples.length === 0) return { p05: NaN, p95: NaN };
  const sorted = [...validSamples].sort((a, b) => a - b);
  const len = sorted.length;
  const p05Index = Math.max(0, Math.floor(0.05 * len) - 1);
  const p95Index = Math.min(len - 1, Math.ceil(0.95 * len) - 1);
  return {
    p05: sorted[p05Index],
    p95: sorted[p95Index],
  };
}

// Nicely format numbers with adaptive precision and optional left padding
function formatNumber(num, padWidth = 0) {
  let str;
  const absNum = Math.abs(num);

  if (isNaN(num)) str = "NaN";
  else if (!isFinite(num)) str = num > 0 ? "Infinity" : "-Infinity";
  else if (absNum === 0) str = "0";
  else if (absNum < 1e-6 || absNum >= 1e9) str = num.toExponential(4);
  else {
    let decimals;
    if (absNum >= 1000) decimals = 1;
    else if (absNum >= 100) decimals = 2;
    else if (absNum >= 10) decimals = 3;
    else if (absNum >= 1) decimals = 4;
    else if (absNum >= 0.01) decimals = 5;
    else decimals = 6;

    str = num.toFixed(decimals);
    str = str.replace(/\.$/, "");
  }
  return padWidth > 0 ? str.padStart(padWidth) : str;
}

// Average of valid numeric samples; returns NaN if no usable values
function calculateSampleMean(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return NaN;
  const validSamples = samples.filter((n) => !isNaN(n) && isFinite(n));
  if (validSamples.length === 0) return NaN;
  const sum = validSamples.reduce((acc, val) => acc + val, 0);
  return sum / validSamples.length;
}

// Build text lines for a simple histogram of sample distribution
function generateTextHistogram(samples, options = {}) {
  const numBins = options.bins ?? DEFAULT_BINS;
  const maxBarWidth = options.width ?? DEFAULT_WIDTH;
  const barChar = (options.barChar ?? DEFAULT_BAR).slice(0, 1) || DEFAULT_BAR;
  const output = [];
  if (!Array.isArray(samples) || samples.length === 0) return ["Histogram unavailable (no samples)."];

  const validSamples = samples.filter((n) => !isNaN(n) && isFinite(n));
  if (validSamples.length === 0) return ["Cannot generate histogram (no valid numeric samples)."];

  const minVal = Math.min(...validSamples);
  const maxVal = Math.max(...validSamples);
  const sampleMean = calculateSampleMean(validSamples);

  if (minVal === maxVal) {
    const label = formatNumber(minVal, 7);
    output.push(`${label} | ${barChar.repeat(maxBarWidth)} (all samples)`);
    return output;
  }

  const binSize = (maxVal - minVal) / numBins;
  const binCounts = Array(numBins).fill(0);
  for (const sample of validSamples) {
    let binIndex = binSize === 0 ? 0 : Math.floor((sample - minVal) / binSize);
    if (binIndex >= numBins) binIndex = numBins - 1;
    if (binIndex < 0) binIndex = 0;
    binCounts[binIndex]++;
  }

  const maxCount = Math.max(...binCounts);
  if (maxCount === 0) return ["Cannot generate histogram (counts are zero)."];

  let meanBinIndex = binSize === 0 ? 0 : Math.floor((sampleMean - minVal) / binSize);
  if (meanBinIndex >= numBins) meanBinIndex = numBins - 1;
  if (meanBinIndex < 0) meanBinIndex = 0;

  for (let i = numBins - 1; i >= 0; i--) {
    const binStart = minVal + i * binSize;
    const count = binCounts[i];
    const barWidth = maxCount === 0 ? 0 : Math.round((count / maxCount) * maxBarWidth);
    const bar = barChar.repeat(barWidth);
    const label = formatNumber(binStart, 7);

    let line = `${label} | ${bar}`;
    if (i === meanBinIndex) {
      line += ` (mean≈${formatNumber(sampleMean)})`;
    }
    output.push(line);
  }
  return output;
}

const core = {
  DEFAULT_SAMPLES,
  DEFAULT_BINS,
  DEFAULT_WIDTH,
  DEFAULT_BAR,
  tokenize,
  shuntingYard,
  evalRpn,
  evaluateExpression,
  getQuantiles,
  formatNumber,
  generateTextHistogram,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = core;
}
const browserWindow = typeof globalThis !== "undefined" ? globalThis.window : undefined;
if (browserWindow) {
  browserWindow.UnsureCalcCore = core;
}
