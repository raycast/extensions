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
];

// Smart expression completion
function completeExpression(expression: string): string {
  let completed = expression;

  // Count parentheses
  const openParens = (completed.match(/\(/g) || []).length;
  const closeParens = (completed.match(/\)/g) || []).length;

  // Check if we're in the middle of an incomplete operation
  // Use identity element: 0 for +/-, 1 for */
  if (/[+-]\s*$/.test(completed)) {
    completed += "0"; // Identity for addition/subtraction
  } else if (/[*/]\s*$/.test(completed)) {
    completed += "1"; // Identity for multiplication/division
  }

  // If we have unclosed parentheses and the last char isn't an operator or comma
  // we might need to close them
  if (openParens > closeParens) {
    // Check if we're ending with a number or closing paren
    if (/[\d)]$/.test(completed)) {
      // Close all open parentheses
      completed += ")".repeat(openParens - closeParens);
    } else if (/,\s*$/.test(completed)) {
      // Ends with comma - assume 0 for the argument
      completed += "0" + ")".repeat(openParens - closeParens);
    }
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
    // Allow common Math methods
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    log: Math.log,
    ln: Math.log,
    log10: Math.log10,
    exp: Math.exp,
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
