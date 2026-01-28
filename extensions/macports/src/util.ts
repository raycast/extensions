import type { Maintainer, PortDetails } from "./types";

export function extractVersion(portLine: string): string {
  const versionMatch = portLine.match(/@([\d.]+)(?:\s|$)/);
  return versionMatch ? versionMatch[1] : "";
}

export function extractPortDetails(name: string, info: string): PortDetails {
  function extractValue(key: string): string {
    const regex = new RegExp(`^${key}:\\s*([\\s\\S]*?)(?=^[A-Z][a-zA-Z\\s]+:|$)`, "im");
    const match = info.match(regex);
    return match ? match[1].trim() : "";
  }

  function parseList(value: string): string[] {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseMaintainers(): Maintainer[] {
    const pairs = info.matchAll(/Email:\s*([^\s,]+)\s*[,\s]+GitHub:\s*([^\s,]+)/gi);
    return Array.from(pairs).map((match) => ({
      email: match[1],
      github: match[2],
    }));
  }

  const firstLine = info.split("\n")[0];
  const version = extractVersion(firstLine);

  return {
    name,
    version,
    description: extractValue("Description"),
    homepage: extractValue("Homepage"),
    maintainers: parseMaintainers(),
    variants: parseList(extractValue("Variants")),
    dependencies: extractValue("Library Dependencies") ? parseList(extractValue("Library Dependencies")) : [],
  };
}

function validatePortName(name: string): boolean {
  const validPortNameRegex = /^[a-zA-Z0-9_+-]+$/;
  return validPortNameRegex.test(name);
}

export function sanitizePortName(name: string): string {
  if (!validatePortName(name)) {
    throw new Error(
      "Invalid port name. Port names can only contain letters, numbers, underscores, plus signs, and hyphens.",
    );
  }
  return name;
}

export function extractInstalledPorts(input: string): string[] {
  if (!input) return [];

  const lines = input.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("no") && lower.includes("ports") && lower.includes("installed")) return [];
  }

  return lines
    .map((line) => line.trim())
    .filter((line) => line)
    .map((line) => line.split(" ")[0]);
}
