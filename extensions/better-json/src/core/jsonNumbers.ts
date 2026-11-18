// Raycast's Node.js 22 runtime supports raw JSON. Keep it behind this type
// because the project's ES2023 TypeScript library predates JSON.rawJSON.
const rawJSON = (JSON as typeof JSON & { rawJSON(source: string): unknown }).rawJSON;

export class ExactJsonNumber {
  constructor(readonly source: string) {
    Object.freeze(this);
  }

  toJSON(): unknown {
    return rawJSON(this.source);
  }

  toString(): string {
    return this.source;
  }
}

export function parseExactJson(source: string): unknown {
  // Native parsing supplies syntax validation and error locations. Most inputs
  // can also keep its fast result, without running a recursive reviver.
  const value: unknown = JSON.parse(source);
  for (const token of jsonTokens(source)) {
    if (isNumberToken(token) && needsExactNumber(token)) return parseExactTokens(source);
  }
  return value;
}

function needsExactNumber(source: string): boolean {
  const value = Number(source);
  if (!Number.isFinite(value) || Object.is(value, -0)) return true;
  const output = String(value);
  return source !== output && normalizeDecimal(source) !== normalizeDecimal(output);
}

function normalizeDecimal(source: string): string {
  const [mantissa, exponent = "0"] = source.toLowerCase().split("e");
  const negative = mantissa.startsWith("-");
  const unsigned = negative ? mantissa.slice(1) : mantissa;
  const point = unsigned.indexOf(".");
  const fractionLength = point < 0 ? 0 : unsigned.length - point - 1;
  const digits = unsigned.replace(".", "").replace(/^0+/, "");
  if (!digits) return "0";
  const coefficient = digits.replace(/0+$/, "");
  const power = Number(exponent) - fractionLength + digits.length - coefficient.length;
  return (negative ? "-" : "") + coefficient + "e" + power;
}

function isNumberToken(token: string): boolean {
  return token[0] === "-" || (token[0] >= "0" && token[0] <= "9");
}

function* jsonTokens(source: string): Generator<string> {
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index++;
    } else if (character === '"') {
      const start = index++;
      // Jump over long strings without a recursive regular expression or
      // examining every ordinary character. Native parsing validated escapes.
      while (true) {
        const end = source.indexOf('"', index);
        let backslashes = 0;
        for (let cursor = end - 1; source[cursor] === "\\"; cursor--) backslashes++;
        index = end + 1;
        if (backslashes % 2 === 0) break;
      }
      yield source.slice(start, index);
    } else if ("{}[],:".includes(character)) {
      yield source[index++];
    } else {
      const start = index;
      while (index < source.length && !/[\s,\]}]/.test(source[index])) index++;
      yield source.slice(start, index);
    }
  }
}

function parseExactTokens(source: string): unknown {
  type Frame = { value: unknown[] | Record<string, unknown>; key?: string };
  const frames: Frame[] = [];
  let result: unknown;
  const append = (value: unknown) => {
    const parent = frames.at(-1);
    if (!parent) result = value;
    else if (Array.isArray(parent.value)) parent.value.push(value);
    else {
      // Preserve duplicate-key semantics and ordinary own __proto__ properties.
      Object.defineProperty(parent.value, parent.key!, {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      parent.key = undefined;
    }
  };
  for (const token of jsonTokens(source)) {
    if (token === "{" || token === "[") {
      const value = token === "[" ? [] : {};
      append(value);
      frames.push({ value });
    } else if (token === "}" || token === "]") {
      frames.pop();
    } else if (token !== "," && token !== ":") {
      const parent = frames.at(-1);
      if (token.startsWith('"') && parent && !Array.isArray(parent.value) && parent.key === undefined) {
        parent.key = JSON.parse(token) as string;
      } else {
        append(isNumberToken(token) && needsExactNumber(token) ? new ExactJsonNumber(token) : JSON.parse(token));
      }
    }
  }
  return result;
}
