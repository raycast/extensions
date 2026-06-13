import { MAX_INPUT_BYTES, getUtf8ByteLength } from "../../src/lib/input";

function fillAsciiJsonString(
  prefix: string,
  suffix: string,
  targetBytes: number,
): string {
  const fixedBytes = getUtf8ByteLength(prefix) + getUtf8ByteLength(suffix);
  return `${prefix}${"x".repeat(targetBytes - fixedBytes)}${suffix}`;
}

export function createCompactJsonFixture(
  targetBytes = MAX_INPUT_BYTES,
): string {
  return fillAsciiJsonString('{"payload":"', '"}', targetBytes);
}

export function createNestedJsonFixture(targetBytes = MAX_INPUT_BYTES): string {
  const prefix = '{"data":{"items":[{"id":1,"payload":"';
  const suffix = '"}]}}';
  return fillAsciiJsonString(prefix, suffix, targetBytes);
}

export function createInvalidLogFixture(targetBytes = MAX_INPUT_BYTES): string {
  const prefix = "2026-06-13 INFO request ";
  const suffix =
    " {user:'alice', roles:['admin',], /* retained */ active:true}";
  const fillerBytes =
    targetBytes - getUtf8ByteLength(prefix) - getUtf8ByteLength(suffix);
  return `${prefix}${"x".repeat(fillerBytes)}${suffix}`;
}
