import { homedir } from "node:os";
import { resolve } from "node:path";

export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_\-./:]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function expandTildePath(value: string): string {
  if (value === "~") {
    return homedir();
  }

  if (value.startsWith("~/")) {
    return resolve(homedir(), value.slice(2));
  }

  return value;
}
