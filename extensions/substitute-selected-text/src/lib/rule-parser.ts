export type ParsedSubstituteRule = {
  input: string;
  delimiter: string;
  pattern: string;
  replacement: string;
  flags: string;
  sedExpression: string;
};

function readSegment(
  source: string,
  startIndex: number,
  delimiter: string,
): { value: string; nextIndex: number } {
  let escaped = false;
  let value = "";

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      value += char;
      escaped = true;
      continue;
    }

    if (char === delimiter) {
      return { value, nextIndex: index + 1 };
    }

    value += char;
  }

  throw new Error("Invalid substitute rule: missing closing delimiter");
}

export function parseSubstituteRule(rawInput: string): ParsedSubstituteRule {
  const trimmedInput = rawInput.trim();

  if (trimmedInput.length === 0) {
    throw new Error("Invalid substitute rule: empty input");
  }

  const normalizedInput = trimmedInput.startsWith("s")
    ? trimmedInput.slice(1)
    : trimmedInput;

  if (normalizedInput.length === 0) {
    throw new Error("Invalid substitute rule: missing delimiter");
  }

  const delimiter = normalizedInput[0];
  if (/\w/.test(delimiter)) {
    throw new Error(
      "Invalid substitute rule: delimiter must be non-alphanumeric",
    );
  }

  const patternResult = readSegment(normalizedInput, 1, delimiter);
  const replacementResult = readSegment(
    normalizedInput,
    patternResult.nextIndex,
    delimiter,
  );
  const flags = normalizedInput.slice(replacementResult.nextIndex);

  if (flags.includes(delimiter)) {
    throw new Error("Invalid substitute rule: missing closing delimiter");
  }

  return {
    input: trimmedInput,
    delimiter,
    pattern: patternResult.value,
    replacement: replacementResult.value,
    flags,
    sedExpression: `s${delimiter}${patternResult.value}${delimiter}${replacementResult.value}${delimiter}${flags}`,
  };
}
