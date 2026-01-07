import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";

// Generate text icon as SVG data URI
function getTextIcon(text: string): string {
  // Calculate font size - be more generous to fill the icon better
  let fontSize = 22;
  if (text.length === 1) {
    fontSize = 26;
  } else if (text.length === 2) {
    fontSize = 24;
  } else if (text.length === 3) {
    fontSize = 20;
  } else if (text.length === 4) {
    fontSize = 18;
  } else if (text.length >= 5) {
    fontSize = 16;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="#1a1a1a" rx="8"/><text x="20" y="32" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system" font-size="${fontSize}" fill="#ffffff" font-weight="500">${text}</text></svg>`;
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

// Math utility functions
// Note: Several functions below use O(n) algorithms which might seem inefficient, but after
// benchmarking with more than realistic input magnitudes (arrays up to 10,000 elements, fibonacci up to
// n=1,476 meaning we are reaching above what Typescript can represent), all operations complete in sub-millisecond time.
// For interactive use in Raycast, this is more than fast enough and allows us to keep the code simple and maintainable.
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function gcdMultiple(...args: number[]): number {
  if (args.length === 0) return 0;
  return args.reduce((acc, val) => gcd(acc, val));
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function lcmMultiple(...args: number[]): number {
  if (args.length === 0) return 0;
  return args.reduce((acc, val) => lcm(acc, val));
}

function sum(...args: number[]): number {
  return args.reduce((acc, val) => acc + val, 0);
}

function product(...args: number[]): number {
  return args.reduce((acc, val) => acc * val, 1);
}

function avg(...args: number[]): number {
  if (args.length === 0) return 0;
  return sum(...args) / args.length;
}

function min(...args: number[]): number {
  return Math.min(...args);
}

function max(...args: number[]): number {
  return Math.max(...args);
}

function factorial(n: number): number {
  if (n < 0) throw new Error("Factorial is not defined for negative numbers");
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function abs(n: number): number {
  return Math.abs(n);
}

function sqrt(n: number): number {
  return Math.sqrt(n);
}

function pow(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

function round(n: number, decimals = 0): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(n * multiplier) / multiplier;
}

function floor(n: number): number {
  return Math.floor(n);
}

function ceil(n: number): number {
  return Math.ceil(n);
}

function trunc(n: number): number {
  return Math.trunc(n);
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b; // Handle negative numbers correctly
}

// Statistical functions
function median(...args: number[]): number {
  if (args.length === 0) return 0;
  const sorted = [...args].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode(...args: number[]): number {
  if (args.length === 0) return 0;
  const frequency: { [key: number]: number } = {};
  let maxFreq = 0;
  let modeValue = args[0];

  args.forEach((num) => {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) {
      maxFreq = frequency[num];
      modeValue = num;
    }
  });

  return modeValue;
}

function range(...args: number[]): number {
  if (args.length === 0) return 0;
  return Math.max(...args) - Math.min(...args);
}

function variance(...args: number[]): number {
  if (args.length === 0) return 0;
  const mean = avg(...args);
  const squaredDiffs = args.map((x) => Math.pow(x - mean, 2));
  return sum(...squaredDiffs) / args.length;
}

function std(...args: number[]): number {
  return Math.sqrt(variance(...args));
}

// Number theory
function isPrime(n: number): number {
  if (n < 2) return 0;
  if (n === 2) return 1;
  if (n % 2 === 0) return 0;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return 0;
  }
  return 1;
}

function fibonacci(n: number): number {
  if (n < 0) throw new Error("Fibonacci is not defined for negative numbers");
  if (n <= 1) return n;
  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

// Combinations and permutations
function ncr(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0 || r === n) return 1;
  return factorial(n) / (factorial(r) * factorial(n - r));
}

function npr(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  return factorial(n) / factorial(n - r);
}

// Hyperbolic functions
function sinh(x: number): number {
  return Math.sinh(x);
}

function cosh(x: number): number {
  return Math.cosh(x);
}

function tanh(x: number): number {
  return Math.tanh(x);
}

// Unit conversions
function deg2rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function rad2deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

// Function definitions for display
const functionDefinitions = [
  { name: "sum", description: "Add multiple numbers", example: "sum(1, 2, 3)", icon: "Σ" },
  { name: "product", description: "Multiply multiple numbers", example: "product(2, 3, 4)", icon: "∏" },
  { name: "avg", description: "Calculate average", example: "avg(10, 20, 30)", icon: "x̄" },
  { name: "min", description: "Find minimum value", example: "min(5, 2, 8)", icon: "min" },
  { name: "max", description: "Find maximum value", example: "max(5, 2, 8)", icon: "max" },
  { name: "gcd", description: "Greatest Common Divisor", example: "gcd(48, 18)", icon: "gcd" },
  { name: "lcm", description: "Least Common Multiple", example: "lcm(12, 18)", icon: "lcm" },
  { name: "factorial", description: "Calculate factorial", example: "factorial(5)", icon: "n!" },
  { name: "abs", description: "Absolute value", example: "abs(-5)", icon: "|x|" },
  { name: "sqrt", description: "Square root", example: "sqrt(16)", icon: "√" },
  { name: "pow", description: "Power function", example: "pow(2, 3)", icon: "xⁿ" },
  { name: "round", description: "Round number", example: "round(3.14159, 2)", icon: "≈" },
  { name: "floor", description: "Round down", example: "floor(3.7)", icon: "⌊x⌋" },
  { name: "ceil", description: "Round up", example: "ceil(3.2)", icon: "⌈x⌉" },
  { name: "sin", description: "Sine", example: "sin(PI/2)", icon: "sin" },
  { name: "cos", description: "Cosine", example: "cos(0)", icon: "cos" },
  { name: "tan", description: "Tangent", example: "tan(PI/4)", icon: "tan" },
  { name: "log", description: "Natural logarithm", example: "log(E)", icon: "ln" },
  { name: "log10", description: "Base-10 logarithm", example: "log10(100)", icon: "log" },
  { name: "exp", description: "Exponential (e^x)", example: "exp(1)", icon: "eˣ" },
  { name: "trunc", description: "Truncate decimal", example: "trunc(3.7)", icon: "⌊x⌉" },
  { name: "mod", description: "Modulo operation", example: "mod(17, 5)", icon: "%" },
  { name: "median", description: "Find median value", example: "median(1, 3, 5)", icon: "med" },
  { name: "mode", description: "Most frequent value", example: "mode(1, 2, 2, 3)", icon: "mod" },
  { name: "range", description: "Max minus min", example: "range(1, 5, 3)", icon: "rng" },
  { name: "variance", description: "Variance", example: "variance(1, 2, 3)", icon: "σ²" },
  { name: "std", description: "Standard deviation", example: "std(1, 2, 3)", icon: "σ" },
  { name: "isPrime", description: "Check if prime (1/0)", example: "isPrime(17)", icon: "p?" },
  { name: "fibonacci", description: "Nth Fibonacci number", example: "fibonacci(10)", icon: "Fₙ" },
  { name: "ncr", description: "Combinations (n choose r)", example: "ncr(5, 2)", icon: "nCr" },
  { name: "npr", description: "Permutations", example: "npr(5, 2)", icon: "nPr" },
  { name: "sinh", description: "Hyperbolic sine", example: "sinh(1)", icon: "sinh" },
  { name: "cosh", description: "Hyperbolic cosine", example: "cosh(1)", icon: "cosh" },
  { name: "tanh", description: "Hyperbolic tangent", example: "tanh(1)", icon: "tanh" },
  { name: "deg2rad", description: "Degrees to radians", example: "deg2rad(180)", icon: "°→r" },
  { name: "rad2deg", description: "Radians to degrees", example: "rad2deg(PI)", icon: "r→°" },
];

// Smart expression completion
function completeExpression(expression: string): string {
  let completed = expression;

  // Remove all trailing incomplete operations and commas
  // e.g., "sum(5,--+/*" -> "sum(5", "sum(5," -> "sum(5"
  completed = completed.replace(/[,+\-*/\s]+$/, "");

  // Count parentheses
  const openParens = (completed.match(/\(/g) || []).length;
  const closeParens = (completed.match(/\)/g) || []).length;

  // Close all unclosed parentheses
  if (openParens > closeParens) {
    completed += ")".repeat(openParens - closeParens);
  }

  return completed;
}

// Create a safe evaluation environment with our math functions
function evaluateMathExpression(expression: string, autoComplete = false): number {
  // Create a context with available math functions
  const mathContext = {
    sum,
    gcd: gcdMultiple,
    lcm: lcmMultiple,
    product,
    avg,
    min,
    max,
    factorial,
    abs,
    sqrt,
    pow,
    round,
    floor,
    ceil,
    trunc,
    mod,
    // Statistical
    median,
    mode,
    range,
    variance,
    std,
    // Number theory
    isPrime,
    fibonacci,
    // Combinations/Permutations
    ncr,
    npr,
    // Trigonometry
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    // Hyperbolic
    sinh,
    cosh,
    tanh,
    // Logarithms
    log: Math.log,
    ln: Math.log,
    log10: Math.log10,
    exp: Math.exp,
    // Unit conversions
    deg2rad,
    rad2deg,
    // Constants - support both upper and lowercase
    PI: Math.PI,
    pi: Math.PI,
    E: Math.E,
    e: Math.E,
  };

  // Clean the expression
  let cleanExpression = expression.trim();

  // If autoComplete is enabled, try to complete the expression
  if (autoComplete) {
    cleanExpression = completeExpression(cleanExpression);
  }

  // Create a function that evaluates the expression in a controlled context
  try {
    // Build the function parameters and arguments
    const paramNames = Object.keys(mathContext);
    const paramValues = Object.values(mathContext);

    // Create and execute the function
    const func = new Function(...paramNames, `"use strict"; return (${cleanExpression});`);
    const result = func(...paramValues);

    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error("Result is not a valid number");
    }

    return result;
  } catch (error) {
    throw new Error(`Invalid expression: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  // Calculate result for the current expression
  const getResult = (): { value: string; error?: string; completed?: string } | null => {
    if (!searchText || searchText.trim() === "") {
      return null;
    }

    try {
      const value = evaluateMathExpression(searchText, true);
      const completed = completeExpression(searchText);
      return { value: value.toString(), completed };
    } catch (error) {
      return {
        value: "",
        error: error instanceof Error ? error.message : "Invalid expression",
      };
    }
  };

  const result = getResult();

  // Filter function suggestions based on search text
  const getFilteredFunctions = () => {
    if (!searchText) {
      return functionDefinitions;
    }

    // Extract the last incomplete function name from the expression
    // Match patterns like "fac", "sum(1, fac", "sum(1, max(5, fa"
    const match = searchText.match(/([a-zA-Z]+)(?:\()?$/);
    const partialFunction = match ? match[1].toLowerCase() : searchText.toLowerCase();

    return functionDefinitions.filter((func) => func.name.toLowerCase().startsWith(partialFunction));
  };

  const filteredFunctions = getFilteredFunctions();

  return (
    <List
      searchBarPlaceholder="Enter math expression (e.g., sum(5, 7) or lcm(12, 18))"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
    >
      {/* Show result if we have one */}
      {result && !result.error && (
        <List.Item
          title={result.value}
          subtitle={result.completed !== searchText ? `Evaluated: ${result.completed}` : searchText}
          icon={{ source: Icon.Calculator }}
          accessories={[{ text: "Press ⏎ to copy", icon: Icon.Clipboard }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Result"
                content={result.value}
                onCopy={() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Copied to clipboard",
                    message: result.value,
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Full Expression"
                content={`${result.completed} = ${result.value}`}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Show error only if there are no matching functions */}
      {result && result.error && filteredFunctions.length === 0 && (
        <List.Item
          title="Error"
          subtitle={result.error}
          icon={{ source: Icon.XMarkCircle }}
          accessories={[{ text: "Invalid expression" }]}
        />
      )}

      {/* Show available functions */}
      {!searchText && (
        <List.Section title="Available Functions">
          {functionDefinitions.map((func) => (
            <List.Item
              key={func.name}
              title={func.name}
              subtitle={func.description}
              accessories={[{ text: func.example }]}
              icon={getTextIcon(func.icon)}
              actions={
                <ActionPanel>
                  <Action title="Use This Function" onAction={() => setSearchText(func.name + "(")} />
                  <Action.CopyToClipboard
                    title="Copy Example"
                    content={func.example}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Show filtered functions when searching or when there's an error */}
      {searchText && filteredFunctions.length > 0 && (!result?.value || result?.error) && (
        <List.Section title="Matching Functions">
          {filteredFunctions.map((func) => {
            // Replace the partial function name with the complete one
            const match = searchText.match(/([a-zA-Z]+)(?:\()?$/);
            const replacement = match ? searchText.slice(0, -match[1].length) + func.name + "(" : func.name + "(";

            return (
              <List.Item
                key={func.name}
                title={func.name}
                subtitle={func.description}
                accessories={[{ text: func.example }]}
                icon={getTextIcon(func.icon)}
                actions={
                  <ActionPanel>
                    <Action title="Use This Function" onAction={() => setSearchText(replacement)} />
                    <Action.CopyToClipboard
                      title="Copy Example"
                      content={func.example}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
