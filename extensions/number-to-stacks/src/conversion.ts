export type StackSize = 64 | 16;

export type Conversion =
  | { status: "empty" }
  | { status: "error"; message: string }
  | {
      status: "success";
      direction: "items-to-stacks" | "stacks-to-items";
      items: bigint;
      stacks: bigint;
      remainder: bigint;
      result: string;
    };

const integer = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)`;
const decimal = String.raw`(?:${integer}(?:\.\d+)?|\.\d+)`;
const itemQuery = new RegExp(
  String.raw`^(${integer})(?:\s+items?)?(?:\s+to\s+stacks?)?$`,
  "i",
);
const stackQuery = new RegExp(
  String.raw`^(${decimal})\s+stacks?(?:\s+(?:and\s+)?(${integer})\s+items?)?(?:\s+to\s+items?)?$`,
  "i",
);

export function formatQuantity(count: bigint, unit: "stack" | "item"): string {
  return `${count.toLocaleString("en-US")} ${unit}${count === 1n ? "" : "s"}`;
}

function formatStacks(stacks: bigint, remainder: bigint): string {
  if (stacks === 0n) return formatQuantity(remainder, "item");
  if (remainder === 0n) return formatQuantity(stacks, "stack");
  return `${formatQuantity(stacks, "stack")} and ${formatQuantity(remainder, "item")}`;
}

function parseInteger(value: string): bigint {
  return BigInt(value.replaceAll(",", ""));
}

/** Use an integer ratio so decimal stacks never round or lose precision. */
function itemsInStacks(
  value: string,
  stackSize: StackSize,
): bigint | undefined {
  const [whole, fraction = ""] = value.replaceAll(",", "").split(".");
  const numerator = BigInt(`${whole}${fraction}`) * BigInt(stackSize);
  const denominator = 10n ** BigInt(fraction.length);
  return numerator % denominator === 0n ? numerator / denominator : undefined;
}

export function convertQuery(query: string, stackSize: StackSize): Conversion {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!normalized) return { status: "empty" };

  const itemMatch = normalized.match(itemQuery);
  if (itemMatch) {
    const items = parseInteger(itemMatch[1]);
    const stacks = items / BigInt(stackSize);
    const remainder = items % BigInt(stackSize);
    return {
      status: "success",
      direction: "items-to-stacks",
      items,
      stacks,
      remainder,
      result: formatStacks(stacks, remainder),
    };
  }

  const stackMatch = normalized.match(stackQuery);
  if (stackMatch) {
    const stackItems = itemsInStacks(stackMatch[1], stackSize);
    if (stackItems === undefined) {
      return {
        status: "error",
        message: `That stack quantity doesn't equal whole items with ${stackSize} items per stack. No rounding is applied.`,
      };
    }
    const items = stackItems + parseInteger(stackMatch[2] ?? "0");
    return {
      status: "success",
      direction: "stacks-to-items",
      items,
      stacks: items / BigInt(stackSize),
      remainder: items % BigInt(stackSize),
      result: formatQuantity(items, "item"),
    };
  }

  return {
    status: "error",
    message:
      'Try "144 to stacks", "1.5 stacks to items", or "2 stacks and 16 items". Use non-negative quantities and whole items.',
  };
}
