import { Detail, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";

interface Arguments {
  query: string;
}

interface ParsedQuery {
  value: number;
  fromUnit: "radians" | "degrees";
  toUnit: "radians" | "degrees";
  isValid: boolean;
  error?: string;
}

function parseQuery(query: string): ParsedQuery {
  const cleanQuery = query.toLowerCase().trim();

  // Extract conversion direction
  const toRadians = cleanQuery.includes("to rad") || cleanQuery.includes("to radians");
  const toDegrees = cleanQuery.includes("to deg") || cleanQuery.includes("to degrees");

  if (!toRadians && !toDegrees) {
    return {
      value: 0,
      fromUnit: "degrees",
      toUnit: "radians",
      isValid: false,
      error: "Please specify conversion direction (e.g., 'to rad' or 'to deg')",
    };
  }

  const toUnit = toRadians ? "radians" : "degrees";
  const fromUnit = toRadians ? "degrees" : "radians";

  // Remove conversion direction and extract the value part
  let valuePart = cleanQuery;
  if (toRadians) {
    valuePart = valuePart.replace(/to radians?/, "").trim();
  } else {
    valuePart = valuePart.replace(/to degrees?/, "").trim();
  }

  // Remove unit indicators from value part
  valuePart = valuePart.replace(/radians?|rad|degrees?|deg/g, "").trim();

  if (!valuePart) {
    return { value: 0, fromUnit, toUnit, isValid: false, error: "Please provide a value to convert" };
  }

  // Handle pi expressions
  const piRegex = /(\d*\.?\d*)\s*\*?\s*pi|pi\s*\*?\s*(\d*\.?\d*)/g;
  let processedValue = valuePart.replace(piRegex, (match, beforePi, afterPi) => {
    const coeff = (parseFloat(beforePi) || 0) + (parseFloat(afterPi) || 0);
    return (coeff || 1) * Math.PI;
  });

  // Replace "pi" with π
  processedValue = processedValue.replace(/\bpi\b/g, Math.PI.toString());

  // Handle divisions and multiplications
  try {
    // Simple expression evaluator for basic math
    processedValue = processedValue.replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, (match, num, denom) => {
      return (parseFloat(num) / parseFloat(denom)).toString();
    });

    processedValue = processedValue.replace(/(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)/g, (match, a, b) => {
      return (parseFloat(a) * parseFloat(b)).toString();
    });

    const value = parseFloat(processedValue);

    if (isNaN(value)) {
      return { value: 0, fromUnit, toUnit, isValid: false, error: `Could not parse value: "${valuePart}"` };
    }

    return { value, fromUnit, toUnit, isValid: true };
  } catch {
    return { value: 0, fromUnit, toUnit, isValid: false, error: `Invalid expression: "${valuePart}"` };
  }
}

function convertAngle(value: number, fromUnit: "radians" | "degrees", toUnit: "radians" | "degrees"): number {
  if (fromUnit === toUnit) return value;

  if (fromUnit === "degrees" && toUnit === "radians") {
    return value * (Math.PI / 180);
  } else {
    return value * (180 / Math.PI);
  }
}

function formatResult(value: number, unit: "radians" | "degrees"): string {
  // Helper function to remove trailing zeros
  const formatNumber = (num: number): string => {
    // Round to 10 decimal places to handle floating point precision issues
    const rounded = Math.round(num * 1e10) / 1e10;
    const str = rounded.toString();
    if (str.includes(".")) {
      return str.replace(/\.?0+$/, "");
    }
    return str;
  };

  if (unit === "degrees") {
    return `${formatNumber(value)}°`;
  } else {
    // For radians, try to express in terms of π when close to common fractions
    const piValue = value / Math.PI;
    const tolerance = 0.001;

    const commonFractions = [
      { fraction: 1 / 6, text: "π/6" },
      { fraction: 1 / 4, text: "π/4" },
      { fraction: 1 / 3, text: "π/3" },
      { fraction: 1 / 2, text: "π/2" },
      { fraction: 2 / 3, text: "2π/3" },
      { fraction: 3 / 4, text: "3π/4" },
      { fraction: 5 / 6, text: "5π/6" },
      { fraction: 1, text: "π" },
      { fraction: 4 / 3, text: "4π/3" },
      { fraction: 3 / 2, text: "3π/2" },
      { fraction: 5 / 3, text: "5π/3" },
      { fraction: 2, text: "2π" },
    ];

    for (const { fraction, text } of commonFractions) {
      if (Math.abs(piValue - fraction) < tolerance) {
        return text;
      }
    }

    // Check for multiples of π
    if (Math.abs(piValue - Math.round(piValue)) < tolerance) {
      const multiplier = Math.round(piValue);
      return multiplier === 1 ? "π" : `${multiplier}π`;
    }

    return `${formatNumber(value)} rad`;
  }
}

export default function Command(props: { arguments: Arguments }) {
  const { query } = props.arguments;
  const [result, setResult] = useState<{ value: number; unit: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<{ value: number; unit: string } | null>(null);

  useEffect(() => {
    if (!query?.trim()) {
      setResult(null);
      setError(null);
      setInputValue(null);
      return;
    }

    const parsed = parseQuery(query);

    if (!parsed.isValid) {
      setError(parsed.error || "Invalid query");
      setResult(null);
      setInputValue(null);
      return;
    }

    setInputValue({ value: parsed.value, unit: parsed.fromUnit });
    setError(null);

    const converted = convertAngle(parsed.value, parsed.fromUnit, parsed.toUnit);
    setResult({ value: converted, unit: parsed.toUnit });
  }, [query]);

  if (!query?.trim()) {
    const examples = [
      "60deg to rad",
      "π/2 to deg",
      "90 degrees to radians",
      "3π/2 rad to degrees",
      "180 to rad",
      "2π to deg",
    ];

    const markdown = `# Convert between radians and degrees

You did not enter a query. Displaying example usasge.


## Examples
${examples.map((ex) => `- \`${ex}\``).join("\n")}

## Usage
- \`X deg to rad\` - Convert degrees to radians
- \`X rad to deg\` - Convert radians to degrees
- \`X degrees to radians\` - Full form
- \`π/2 to deg\` - Use π in expressions
- \`3π/2 rad to deg\` - Complex expressions with π

Type a conversion query above to get started!`;

    return <Detail markdown={markdown} />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error

${error}

## Try these examples:
- \`60deg to rad\`
- \`π/2 to deg\`
- \`90 degrees to radians\`
- \`3π/2 rad to degrees\``}
      />
    );
  }

  if (inputValue && result) {
    const inputFormatted = formatResult(inputValue.value, inputValue.unit as "radians" | "degrees");
    const resultFormatted = formatResult(result.value, result.unit as "radians" | "degrees");

    const markdown = `# Angle Conversion

Go back to Raycast Search to convert another value.

## Examples
- \`60deg to rad\`
- \`π/2 to deg\`
- \`90 degrees to radians\`
- \`3π/2 rad to degrees\`
- \`180 to rad\`
- \`2π to deg\`

## Quick Tips
- Press \`Cmd+Enter\` to copy the result
- Press \`Esc\` to go back to Raycast search`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Result" content={resultFormatted} />
            <Action.CopyToClipboard title="Copy Full Conversion" content={`${inputFormatted} = ${resultFormatted}`} />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Input" text={inputFormatted} />
            <Detail.Metadata.Label title="Result" text={resultFormatted} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Conversion" text={`${inputValue.unit} → ${result.unit}`} />
          </Detail.Metadata>
        }
      />
    );
  }

  return <Detail markdown="# Processing..." />;
}
