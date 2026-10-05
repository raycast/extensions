import {
  calculateModbusCrc,
  calculateModbusLrc,
  formatHexBytes,
  ModbusProtocol,
} from "./modbus";

export type BuildFunctionCode = "1" | "2" | "3" | "4" | "5" | "6" | "15" | "16";

export type BuildRequestInput = {
  protocol: ModbusProtocol;
  functionCode: BuildFunctionCode;
  unitAddress: string;
  transactionId: string;
  startingAddress: string;
  quantity: string;
  singleValue: string;
  coilValue: "on" | "off";
  values: string;
};

export function buildModbusRequest(input: BuildRequestInput) {
  const functionCode = Number(input.functionCode);
  const unitMaximum = input.protocol === "tcp" ? 255 : 247;
  const unitAddress = parseInteger(
    input.unitAddress,
    "unit address",
    0,
    unitMaximum,
  );
  const startingAddress = parseInteger(
    input.startingAddress,
    "starting address",
    0,
    0xffff,
  );
  const pdu = [functionCode, ...wordBytes(startingAddress)];

  if (functionCode >= 1 && functionCode <= 4) {
    const maximum = functionCode <= 2 ? 2000 : 125;
    const quantity = parseInteger(input.quantity, "quantity", 1, maximum);
    validateAddressRange(startingAddress, quantity);
    pdu.push(...wordBytes(quantity));
  } else if (functionCode === 5) {
    pdu.push(...wordBytes(input.coilValue === "on" ? 0xff00 : 0));
  } else if (functionCode === 6) {
    pdu.push(
      ...wordBytes(
        parseInteger(input.singleValue, "register value", 0, 0xffff),
      ),
    );
  } else if (functionCode === 15) {
    const values = parseCoilValues(input.values);
    if (values.length > 1968) {
      throw new Error("Write Multiple Coils supports at most 1968 coils");
    }
    validateAddressRange(startingAddress, values.length);
    const packed = packCoils(values);
    pdu.push(...wordBytes(values.length), packed.length, ...packed);
  } else {
    const values = parseRegisterValues(input.values);
    if (values.length > 123) {
      throw new Error(
        "Write Multiple Registers supports at most 123 registers",
      );
    }
    validateAddressRange(startingAddress, values.length);
    const payload = values.flatMap(wordBytes);
    pdu.push(...wordBytes(values.length), payload.length, ...payload);
  }

  if (input.protocol === "rtu") {
    const body = [unitAddress, ...pdu];
    const crc = calculateModbusCrc(body);
    return formatHexBytes([...body, crc & 0xff, crc >>> 8]);
  }

  if (input.protocol === "tcp") {
    const transactionId = parseInteger(
      input.transactionId,
      "transaction identifier",
      0,
      0xffff,
    );
    return formatHexBytes([
      ...wordBytes(transactionId),
      0,
      0,
      ...wordBytes(pdu.length + 1),
      unitAddress,
      ...pdu,
    ]);
  }

  const body = [unitAddress, ...pdu];
  const lrc = calculateModbusLrc(body);
  return `:${formatHexBytes([...body, lrc]).replaceAll(" ", "")}\r\n`;
}

function parseInteger(
  raw: string,
  label: string,
  minimum: number,
  maximum: number,
) {
  const value = raw.trim();
  if (!value) throw new Error(`Enter a ${label}`);
  if (!/^(?:0x[0-9a-f]+|\d+)$/i.test(value)) {
    throw new Error(
      `${label[0].toUpperCase()}${label.slice(1)} must be decimal or 0x-prefixed hexadecimal`,
    );
  }
  const parsed = Number.parseInt(
    value,
    value.toLowerCase().startsWith("0x") ? 16 : 10,
  );
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${label[0].toUpperCase()}${label.slice(1)} must be between ${minimum} and ${maximum}`,
    );
  }
  return parsed;
}

function parseCoilValues(raw: string) {
  const tokens = splitValues(raw);
  return tokens.map((token) => {
    const value = token.toLowerCase();
    if (["1", "true", "on"].includes(value)) return true;
    if (["0", "false", "off"].includes(value)) return false;
    throw new Error(
      `Invalid coil value "${token}"; use 1/0, on/off, or true/false`,
    );
  });
}

function parseRegisterValues(raw: string) {
  return splitValues(raw).map((value, index) =>
    parseInteger(value, `register value ${index + 1}`, 0, 0xffff),
  );
}

function splitValues(raw: string) {
  const values = raw
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (!values.length) throw new Error("Enter at least one value");
  return values;
}

function packCoils(values: boolean[]) {
  const bytes = Array.from({ length: Math.ceil(values.length / 8) }, () => 0);
  values.forEach((value, index) => {
    if (value) bytes[Math.floor(index / 8)] |= 1 << (index % 8);
  });
  return bytes;
}

function wordBytes(value: number) {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function validateAddressRange(startingAddress: number, quantity: number) {
  const endingAddress = startingAddress + quantity - 1;
  if (endingAddress > 0xffff) {
    throw new Error(
      `Address range ends at ${endingAddress}, which exceeds 65535`,
    );
  }
}
