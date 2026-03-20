function isPlainScalar(value: string): boolean {
  return (
    /^[A-Za-z0-9._/@-]+$/.test(value) &&
    !["true", "false", "null", "~"].includes(value.toLowerCase())
  );
}

function formatScalar(value: unknown): string {
  if (typeof value === "string") {
    return isPlainScalar(value) ? value : JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  throw new Error("Unsupported scalar type");
}

function isPrimitive(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null || ["string", "number", "boolean"].includes(typeof value)
  );
}

function serialize(value: unknown, indent = 0): string[] {
  const spacer = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ["[]"];
    }

    const lines: string[] = [];

    for (const item of value) {
      if (isPrimitive(item)) {
        lines.push(`${spacer}- ${formatScalar(item)}`);
      } else {
        lines.push(`${spacer}-`);
        lines.push(...serialize(item, indent + 2));
      }
    }

    return lines;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, child]) => child !== undefined,
    );

    if (entries.length === 0) {
      return ["{}"];
    }

    const lines: string[] = [];

    for (const [key, child] of entries) {
      if (isPrimitive(child)) {
        lines.push(`${spacer}${key}: ${formatScalar(child)}`);
      } else {
        lines.push(`${spacer}${key}:`);
        lines.push(...serialize(child, indent + 2));
      }
    }

    return lines;
  }

  if (isPrimitive(value)) {
    return [`${spacer}${formatScalar(value)}`];
  }

  throw new Error("Unsupported YAML value");
}

export function toYaml(value: unknown): string {
  return serialize(value).join("\n");
}
