// shamelessly copied from https://github.com/gaetbout/stark-utils/blob/main/src/utils/index.js#L50

import BN from "bn.js";
import { hash } from "starknet";

function asciiToHex(str: string): string {
  const arr1 = ["0x"];
  for (let n = 0; n < str.length; n++) {
    const hex = Number(str.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join("");
}

function toSelector(val: string): string {
  if (!val) {
    return "";
  }
  return toHex((toBN(hash.getSelectorFromName(val)) as BN).toString());
}

function toBN(val: string): BN | undefined {
  if (!val) {
    return;
  }
  if (BN.isBN(val)) {
    return val;
  }
  if (startWith0xAndIsHex(val)) {
    return new BN(removeHexPrefix(val), 16);
  }
  if (isDecimal(val)) {
    return new BN(val, 10);
  }
  return new BN(removeHexPrefix(asciiToHex(val)), 16);
}

function toBNArray(val: string, chunkSize: number): string[] {
  if (!val) {
    return [];
  }
  const valArray = val.match(new RegExp(`.{1,${chunkSize}}`, "g"));
  return (valArray?.map((v: string) => toBN(v)?.toString()).filter((v) => v) as string[]) ?? [];
}

function toHex(val: string): string {
  if (!val) {
    return "";
  }
  if (startWith0xAndIsHex(val)) {
    return val;
  }
  if (isDecimal(val)) {
    const nbn = new BN(val, 10);
    return addHexPrefix(nbn.toString(16));
  }
  return asciiToHex(val);
}

function to256(val: string): { low: string; high: string } {
  if (!val) {
    return { low: "", high: "" };
  }
  let mask = new BN(2);
  mask = mask.pow(new BN(128));
  mask = mask.sub(new BN(1));

  const bigIn = toBN(val) as BN;

  return { low: bigIn.and(mask).toString(), high: bigIn.shrn(128).toString() };
}

function toBig3(val: string): { D0: string; D1: string; D2: string } {
  if (!val) {
    return { D0: "", D1: "", D2: "" };
  }
  let mask = new BN(2);
  mask = mask.pow(new BN(86));
  mask = mask.sub(new BN(1));
  let bigIn = toBN(val) as BN;

  const D0 = bigIn.and(mask).toString();
  bigIn = bigIn.shrn(86);

  const D1 = bigIn.and(mask).toString();
  const D2 = bigIn.shrn(86).toString();

  return { D0, D1, D2 };
}

function removeHexPrefix(hex: string): string {
  let hexTrim = hex.replace(/^0x/, "");
  if (hexTrim.length % 2 === 1) {
    hexTrim = "0" + hexTrim;
  }
  return hexTrim;
}

function addHexPrefix(hex: string): string {
  return `0x${removeHexPrefix(hex)}`;
}

function startWith0xAndIsHex(val: string): boolean {
  return val.startsWith("0x") && isHex(val);
}

function isHex(val: string): boolean {
  const cleanedInput = removeHexPrefix(val);
  const regexp = /^[0-9a-fA-F]+$/;
  return regexp.test(cleanedInput);
}

function isDecimal(val: string): boolean {
  const decimalRegex = /^[0-9]+$/;
  return decimalRegex.test(val);
}

export default {
  toBN,
  removeHexPrefix,
  addHexPrefix,
  to256,
  toBig3,
  isDecimal,
  toHex,
  toSelector,
  startWith0xAndIsHex,
  toBNArray,
};
