import { Keyboard } from "@raycast/api";
import { parseBigInt } from "./common-utils";

export const convertToBytes = (value: number, unitIndex: number): number => {
  let bytesValue = value;
  if (unitIndex === 0) {
    bytesValue /= 8; // Convert bits to bytes
    return bytesValue;
  }
  for (let i = unitIndex; i > 1; i--) {
    bytesValue *= 1024;
  }
  for (let i = unitIndex; i < 1; i++) {
    bytesValue /= 1024;
  }
  return bytesValue;
};

export const convert = (bytesValue: number, toUnitIndex: number): number => {
  let value = bytesValue;
  if (toUnitIndex === 0) {
    value *= 8; // Convert bytes to bits
    return value;
  }
  for (let i = 1; i < toUnitIndex; i++) {
    value /= 1024;
  }
  for (let i = 1; i > toUnitIndex; i--) {
    value *= 1024;
  }
  value = parseFloat(value.toFixed(2)); // Keep two digits at most
  return value;
};

export const KeyEquivalentByNumber = (number: number): Keyboard.KeyEquivalent | undefined => {
  const keyEquivalents: Record<number, Keyboard.KeyEquivalent> = {
    0: "0",
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
  };
  return keyEquivalents[number];
};

export const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const insertDot = (n: bigint) => {
  let v = n.toString();
  while (v.length < 3) v = "0" + v;
  const p = v.length - 2;
  v = v.substring(0, p) + "." + v.substring(p);
  while (v.at(-1) == "0") v = v.substring(0, v.length - 1);
  if (v.at(-1) == ".") v = v.substring(0, v.length - 1);
  return v;
};

export const parseBigFloat = (n: string) => {
  const dot = n.indexOf(".");
  if (dot == -1) return [parseBigInt(n, 10), BigInt(1)] as const;
  const exp = n.length - dot - 1;
  const m = n.substring(0, dot) + n.substring(dot + 1);
  let quotient = BigInt(1);
  for (let i = 0; i < exp; i++) quotient *= BigInt(10);
  return [parseBigInt(m, 10), quotient] as const;
};
