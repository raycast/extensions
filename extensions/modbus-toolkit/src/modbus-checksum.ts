import {
  calculateModbusCrc,
  calculateModbusLrc,
  formatHexBytes,
  parseHexByteInput,
} from "./modbus";

export type ChecksumAlgorithm = "crc" | "lrc";
export type ChecksumOperation = "calculate" | "verify";

export type ChecksumResult = {
  algorithmLabel: string;
  checksum: string;
  wireBytes: string;
  completeFrame: string;
  valid?: boolean;
  received?: string;
};

export function processModbusChecksum(
  input: string,
  algorithm: ChecksumAlgorithm,
  operation: ChecksumOperation,
): ChecksumResult {
  const bytes =
    algorithm === "lrc" ? parseLrcInput(input) : parseHexByteInput(input);
  if (operation === "calculate") {
    return calculate(bytes, algorithm);
  }

  const checksumLength = algorithm === "crc" ? 2 : 1;
  if (bytes.length <= checksumLength) {
    throw new Error(
      `Enter data followed by the ${algorithm === "crc" ? "two-byte CRC" : "LRC byte"}`,
    );
  }
  const data = bytes.slice(0, -checksumLength);
  const calculated = calculate(data, algorithm);
  const receivedBytes = bytes.slice(-checksumLength);
  const received = formatHexBytes(receivedBytes);
  return {
    ...calculated,
    valid: received === calculated.wireBytes,
    received,
    completeFrame:
      algorithm === "lrc"
        ? `:${bytes.map(hexByte).join("")}\r\n`
        : formatHexBytes(bytes),
  };
}

function calculate(bytes: number[], algorithm: ChecksumAlgorithm) {
  if (algorithm === "crc") {
    const crc = calculateModbusCrc(bytes);
    const wire = [crc & 0xff, crc >>> 8];
    return {
      algorithmLabel: "Modbus RTU CRC16",
      checksum: `0x${crc.toString(16).toUpperCase().padStart(4, "0")}`,
      wireBytes: formatHexBytes(wire),
      completeFrame: formatHexBytes([...bytes, ...wire]),
    };
  }

  const lrc = calculateModbusLrc(bytes);
  return {
    algorithmLabel: "Modbus ASCII LRC",
    checksum: `0x${hexByte(lrc)}`,
    wireBytes: hexByte(lrc),
    completeFrame: `:${[...bytes, lrc].map(hexByte).join("")}\r\n`,
  };
}

function parseLrcInput(raw: string) {
  let value = raw.trim();
  if (value.endsWith("\\r\\n")) value = value.slice(0, -4);
  if (value.startsWith(":")) value = value.slice(1);
  return parseHexByteInput(value);
}

function hexByte(value: number) {
  return value.toString(16).toUpperCase().padStart(2, "0");
}
