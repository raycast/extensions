import { formatHexBytes, parseHexByteInput } from "./modbus";

export type RegisterDataType =
  | "uint16"
  | "int16"
  | "uint32"
  | "int32"
  | "float32"
  | "float64"
  | "ascii"
  | "hex";

export type RegisterByteOrder = "abcd" | "cdab" | "badc" | "dcba";

export type RegisterDecodeResult = {
  value: string;
  rawBytes: string;
  orderedBytes: string;
  typeLabel: string;
  orderLabel: string;
};

const TYPE_LENGTHS: Partial<Record<RegisterDataType, number>> = {
  uint16: 2,
  int16: 2,
  uint32: 4,
  int32: 4,
  float32: 4,
  float64: 8,
};

const TYPE_LABELS: Record<RegisterDataType, string> = {
  uint16: "Unsigned 16-bit Integer",
  int16: "Signed 16-bit Integer",
  uint32: "Unsigned 32-bit Integer",
  int32: "Signed 32-bit Integer",
  float32: "32-bit Floating Point",
  float64: "64-bit Floating Point",
  ascii: "ASCII Text",
  hex: "Hexadecimal",
};

const ORDER_LABELS: Record<RegisterByteOrder, string> = {
  abcd: "ABCD · Big Endian",
  cdab: "CDAB · Word Swap",
  badc: "BADC · Byte Swap",
  dcba: "DCBA · Little Endian",
};

export function decodeRegisterValue(
  input: string,
  dataType: RegisterDataType,
  byteOrder: RegisterByteOrder,
): RegisterDecodeResult {
  const bytes = parseHexByteInput(input);
  if (bytes.length % 2 !== 0) {
    throw new Error(
      "Register data must contain a whole number of 16-bit registers",
    );
  }

  const requiredLength = TYPE_LENGTHS[dataType];
  if (requiredLength && bytes.length !== requiredLength) {
    throw new Error(
      `${TYPE_LABELS[dataType]} requires exactly ${requiredLength} bytes`,
    );
  }
  if (!bytes.length) throw new Error("Enter register bytes");

  const ordered = applyByteOrder(bytes, byteOrder);
  const view = new DataView(Uint8Array.from(ordered).buffer);
  let value: string;

  switch (dataType) {
    case "uint16":
      value = view.getUint16(0, false).toString();
      break;
    case "int16":
      value = view.getInt16(0, false).toString();
      break;
    case "uint32":
      value = view.getUint32(0, false).toString();
      break;
    case "int32":
      value = view.getInt32(0, false).toString();
      break;
    case "float32":
      value = formatFloatingPoint(view.getFloat32(0, false));
      break;
    case "float64":
      value = formatFloatingPoint(view.getFloat64(0, false));
      break;
    case "ascii":
      value = ordered.map(formatAsciiByte).join("");
      break;
    case "hex":
      value = `0x${ordered.map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join("")}`;
      break;
  }

  return {
    value,
    rawBytes: formatHexBytes(bytes),
    orderedBytes: formatHexBytes(ordered),
    typeLabel: TYPE_LABELS[dataType],
    orderLabel: ORDER_LABELS[byteOrder],
  };
}

function applyByteOrder(bytes: number[], order: RegisterByteOrder) {
  if (order === "abcd") return [...bytes];
  if (order === "dcba") return [...bytes].reverse();

  const words: number[][] = [];
  for (let index = 0; index < bytes.length; index += 2) {
    words.push(bytes.slice(index, index + 2));
  }
  if (order === "cdab") return words.reverse().flat();
  return words.flatMap(([high, low]) => [low, high]);
}

function formatFloatingPoint(value: number) {
  if (Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "+Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  if (Object.is(value, -0)) return "-0";
  return value.toPrecision(12).replace(/(?:\.0+|(?:(\.\d*?)0+))(?=e|$)/, "$1");
}

function formatAsciiByte(byte: number) {
  return byte >= 0x20 && byte <= 0x7e
    ? String.fromCharCode(byte)
    : `\\x${byte.toString(16).toUpperCase().padStart(2, "0")}`;
}
