export function parseEnvironment(input: string): string[] {
  const values: string[] = [];
  for (const rawLine of input.split(/\r?\n|,/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) throw new Error(`Invalid environment value “${line}”. Use KEY=VALUE.`);
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`Invalid environment key “${key}”.`);
    values.push(`${key}=${value}`);
  }
  return values;
}

export function parseShellWords(input: string): string[] {
  const words: string[] = [];
  let current = "";
  let quote: "single" | "double" | undefined;
  let escaped = false;
  let started = false;

  for (const char of input.trim()) {
    if (escaped) {
      current += char;
      escaped = false;
      started = true;
      continue;
    }
    if (char === "\\" && quote !== "single") {
      escaped = true;
      started = true;
      continue;
    }
    if (char === "'" && quote !== "double") {
      quote = quote === "single" ? undefined : "single";
      started = true;
      continue;
    }
    if (char === '"' && quote !== "single") {
      quote = quote === "double" ? undefined : "double";
      started = true;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (started) {
        words.push(current);
        current = "";
        started = false;
      }
      continue;
    }
    current += char;
    started = true;
  }

  if (escaped) throw new Error("Arguments cannot end with an unescaped backslash.");
  if (quote) throw new Error(`Arguments contain an unterminated ${quote} quote.`);
  if (started) words.push(current);
  return words;
}

export function shellQuote(value: string): string {
  if (value === "") return "''";
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function markdownCode(value: string): string {
  const longestRun = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${value}\n${fence}`;
}
