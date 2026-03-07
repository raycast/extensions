export type CompareFormValues = {
  listA: string;
  listB: string;
  caseSensitive: boolean;
};

export type ParsedList = {
  uniqueCount: number;
  orderedKeys: string[];
  displayByKey: Map<string, string>;
};

export type ComparisonResult = {
  caseSensitive: boolean;
  inListA: number;
  inListB: number;
  onlyInA: string[];
  onlyInB: string[];
  inBoth: string[];
  inBothCount: number;
  difference: number;
};

function normalizeLine(line: string, caseSensitive: boolean): { key: string; display: string } | null {
  const display = line.trim();
  if (!display) {
    return null;
  }

  return {
    key: caseSensitive ? display : display.toLowerCase(),
    display,
  };
}

export function parseList(input: string, caseSensitive: boolean): ParsedList {
  const orderedKeys: string[] = [];
  const displayByKey = new Map<string, string>();

  for (const line of input.split(/\r?\n/u)) {
    const normalized = normalizeLine(line, caseSensitive);
    if (!normalized || displayByKey.has(normalized.key)) {
      continue;
    }

    orderedKeys.push(normalized.key);
    displayByKey.set(normalized.key, normalized.display);
  }

  return {
    uniqueCount: orderedKeys.length,
    orderedKeys,
    displayByKey,
  };
}

export function compareLists(listA: string, listB: string, caseSensitive: boolean): ComparisonResult {
  const parsedA = parseList(listA, caseSensitive);
  const parsedB = parseList(listB, caseSensitive);

  const keysInB = new Set(parsedB.orderedKeys);
  const keysInA = new Set(parsedA.orderedKeys);

  const onlyInA = parsedA.orderedKeys
    .filter((key) => !keysInB.has(key))
    .map((key) => parsedA.displayByKey.get(key))
    .filter((value): value is string => Boolean(value));

  const onlyInB = parsedB.orderedKeys
    .filter((key) => !keysInA.has(key))
    .map((key) => parsedB.displayByKey.get(key))
    .filter((value): value is string => Boolean(value));

  const inBoth = parsedA.orderedKeys
    .filter((key) => keysInB.has(key))
    .map((key) => parsedA.displayByKey.get(key))
    .filter((value): value is string => Boolean(value));

  return {
    caseSensitive,
    inListA: parsedA.uniqueCount,
    inListB: parsedB.uniqueCount,
    onlyInA,
    onlyInB,
    inBoth,
    inBothCount: inBoth.length,
    difference: parsedA.uniqueCount - parsedB.uniqueCount,
  };
}

export function formatDifference(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}

export function buildSummaryText(result: ComparisonResult): string {
  return [
    "Results:",
    `In List A: ${result.inListA}`,
    `Only in List A: ${result.onlyInA.length}`,
    `In List B: ${result.inListB}`,
    `Only in List B: ${result.onlyInB.length}`,
    `Difference: ${formatDifference(result.difference)}`,
    `In Both Lists: ${result.inBothCount}`,
  ].join("\n");
}
