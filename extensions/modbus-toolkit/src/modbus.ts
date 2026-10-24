export type ModbusProtocol = "rtu" | "tcp" | "ascii";
export type DataDirection = "request" | "response";

export type ParsedField = {
  bytes: string;
  description: string;
  value: string;
};

export type ModbusParseResult = {
  protocol: ModbusProtocol;
  direction: DataDirection;
  functionCode: number;
  functionName: string;
  originalFrame: string;
  normalizedFrame: string;
  fields: ParsedField[];
};

const FUNCTION_NAMES: Record<number, string> = {
  1: "Read Coils",
  2: "Read Discrete Inputs",
  3: "Read Holding Registers",
  4: "Read Input Registers",
  5: "Write Single Coil",
  6: "Write Single Register",
  7: "Read Exception Status",
  8: "Diagnostics",
  11: "Get Comm Event Counter",
  12: "Get Comm Event Log",
  15: "Write Multiple Coils",
  16: "Write Multiple Registers",
  17: "Report Server ID",
  20: "Read File Record",
  21: "Write File Record",
  22: "Mask Write Register",
  23: "Read/Write Multiple Registers",
  24: "Read FIFO Queue",
  43: "Encapsulated Interface Transport",
};

const EXCEPTION_NAMES: Record<number, string> = {
  1: "Illegal Function",
  2: "Illegal Data Address",
  3: "Illegal Data Value",
  4: "Server Device Failure",
  5: "Acknowledge",
  6: "Server Device Busy",
  8: "Memory Parity Error",
  10: "Gateway Path Unavailable",
  11: "Gateway Target Device Failed to Respond",
};

export function parseModbusFrame(
  input: string,
  protocol: ModbusProtocol,
  direction: DataDirection,
): ModbusParseResult {
  let bytes: number[];
  let normalizedFrame: string;

  if (input.trimStart().startsWith(":")) {
    if (protocol !== "ascii") {
      throw new Error(
        "This frame uses the Modbus ASCII format. Select Modbus ASCII instead.",
      );
    }
    ({ bytes, normalizedFrame } = parseAsciiTextFrame(input));
  } else {
    const wireBytes = parseHexByteInput(input);
    if (isAsciiWireFrame(wireBytes)) {
      if (protocol !== "ascii") {
        throw new Error(
          "This frame contains a Modbus ASCII wire message. Select Modbus ASCII instead.",
        );
      }
      ({ bytes, normalizedFrame } = parseAsciiWireFrame(wireBytes));
    } else {
      if (protocol === "ascii") {
        if (isModbusTcpFrame(wireBytes)) {
          throw new Error(
            "This frame contains a valid Modbus TCP header. Select Modbus TCP instead.",
          );
        }
        if (isModbusRtuFrame(wireBytes)) {
          throw new Error(
            "This frame contains a valid Modbus RTU CRC. Select Modbus RTU instead.",
          );
        }
        throw new Error(
          "A Modbus ASCII frame must start with a colon and contain ASCII hexadecimal characters",
        );
      }
      bytes = wireBytes;
      normalizedFrame = byteText(bytes);
    }
  }

  if (
    protocol === "rtu" &&
    !isModbusRtuFrame(bytes) &&
    isModbusTcpFrame(bytes)
  ) {
    throw new Error(
      "This frame contains a valid Modbus TCP header. Select Modbus TCP instead.",
    );
  }
  if (
    protocol === "tcp" &&
    !isModbusTcpFrame(bytes) &&
    isModbusRtuFrame(bytes)
  ) {
    throw new Error(
      "This frame contains a valid Modbus RTU CRC. Select Modbus RTU instead.",
    );
  }

  const minimumLength = protocol === "rtu" ? 4 : protocol === "tcp" ? 8 : 3;
  if (bytes.length < minimumLength) {
    throw new Error(
      `${formatModbusProtocolName(protocol)} frames require at least ${minimumLength} decoded bytes`,
    );
  }

  const fields: ParsedField[] = [];
  let functionCode: number;
  let data: number[];

  if (protocol === "rtu") {
    validateRtuFrame(bytes, direction);
    functionCode = bytes[1];
    data = bytes.slice(2, -2);
    fields.push({
      bytes: byteText(bytes.slice(0, 1)),
      description: "Slave address",
      value: numericValue(bytes[0], 2),
    });
  } else if (protocol === "tcp") {
    validateTcpFrame(bytes);
    const transactionId = uint16(bytes, 0);
    const protocolId = uint16(bytes, 2);
    const declaredLength = uint16(bytes, 4);
    functionCode = bytes[7];
    data = bytes.slice(8);
    fields.push(
      {
        bytes: byteText(bytes.slice(0, 2)),
        description: "Transaction identifier",
        value: numericValue(transactionId, 4),
      },
      {
        bytes: byteText(bytes.slice(2, 4)),
        description: "Protocol identifier",
        value: `${numericValue(protocolId, 4)} · Modbus`,
      },
      {
        bytes: byteText(bytes.slice(4, 6)),
        description: "Length",
        value: `${declaredLength} byte${declaredLength === 1 ? "" : "s"} · Valid`,
      },
      {
        bytes: byteText(bytes.slice(6, 7)),
        description: "Unit identifier",
        value: numericValue(bytes[6], 2),
      },
    );
  } else {
    validateAsciiFrame(bytes, direction);
    functionCode = bytes[1];
    data = bytes.slice(2, -1);
    fields.push({
      bytes: hexByte(bytes[0]),
      description: "Slave address",
      value: numericValue(bytes[0], 2),
    });
  }

  const isException = (functionCode & 0x80) !== 0;
  const baseFunction = functionCode & 0x7f;
  const functionName = isException
    ? `${FUNCTION_NAMES[baseFunction] || "Unknown Function"} Exception`
    : FUNCTION_NAMES[functionCode] || "Unknown Function";

  fields.push({
    bytes: hexByte(functionCode),
    description: "Function code",
    value: `${numericValue(functionCode, 2)} · ${functionName}`,
  });

  if (isException) {
    if (direction !== "response") {
      throw new Error("An exception frame must be parsed as a response");
    }
    requireExactLength(data, 1, "exception response");
    const exceptionCode = data[0];
    fields.push({
      bytes: hexByte(exceptionCode),
      description: "Exception code",
      value: `${numericValue(exceptionCode, 2)} · ${EXCEPTION_NAMES[exceptionCode] || "Unknown Exception"}`,
    });
  } else {
    parseFunctionData(fields, functionCode, data, direction);
  }

  if (protocol === "rtu") {
    const receivedCrc =
      bytes[bytes.length - 2] | (bytes[bytes.length - 1] << 8);
    fields.push({
      bytes: byteText(bytes.slice(-2)),
      description: "CRC",
      value: `${numericValue(receivedCrc, 4)} · Valid`,
    });
  } else if (protocol === "ascii") {
    const receivedLrc = bytes[bytes.length - 1];
    fields.push({
      bytes: hexByte(receivedLrc),
      description: "LRC",
      value: `${numericValue(receivedLrc, 2)} · Valid`,
    });
  }

  return {
    protocol,
    direction,
    functionCode,
    functionName,
    originalFrame: input.trim(),
    normalizedFrame,
    fields,
  };
}

function parseFunctionData(
  fields: ParsedField[],
  functionCode: number,
  data: number[],
  direction: DataDirection,
) {
  if ([1, 2, 3, 4].includes(functionCode)) {
    if (direction === "request") {
      requireExactLength(data, 4, "read request");
      const startingAddress = uint16(data, 0);
      const quantity = uint16(data, 2);
      validateQuantity(
        quantity,
        1,
        functionCode <= 2 ? 2000 : 125,
        "read quantity",
      );
      validateAddressRange(startingAddress, quantity, "read range");
      addAddress(fields, data, 0, "Starting address");
      addWord(fields, data, 2, "Quantity");
    } else {
      addByteCountAndValues(
        fields,
        data,
        functionCode <= 2 ? "bits" : "registers",
      );
    }
    return;
  }

  if (functionCode === 5 || functionCode === 6) {
    requireExactLength(data, 4, "single-write message");
    addAddress(
      fields,
      data,
      0,
      functionCode === 5 ? "Coil address" : "Register address",
    );
    const rawValue = uint16(data, 2);
    if (functionCode === 5 && rawValue !== 0xff00 && rawValue !== 0) {
      throw new Error("A Write Single Coil value must be FF00 or 0000");
    }
    fields.push({
      bytes: byteText(data.slice(2, 4)),
      description: functionCode === 5 ? "Coil value" : "Register value",
      value:
        functionCode === 5
          ? `${numericValue(rawValue, 4)} · ${rawValue === 0xff00 ? "ON" : "OFF"}`
          : numericValue(rawValue, 4),
    });
    return;
  }

  if (functionCode === 15 || functionCode === 16) {
    if (direction === "request") {
      requireLength(data, 5, "multiple-write request");
      const startingAddress = uint16(data, 0);
      const quantity = uint16(data, 2);
      const maximum = functionCode === 15 ? 1968 : 123;
      validateQuantity(quantity, 1, maximum, "write quantity");
      validateAddressRange(startingAddress, quantity, "write range");
      validatePayloadByteCount(
        data,
        4,
        functionCode === 15 ? Math.ceil(quantity / 8) : quantity * 2,
        "multiple-write request",
      );
      addAddress(fields, data, 0, "Starting address");
      addWord(fields, data, 2, "Quantity");
      addByteCountAndPayload(
        fields,
        data,
        4,
        functionCode === 15 ? "Coil values" : "Register values",
      );
    } else {
      requireExactLength(data, 4, "multiple-write response");
      const startingAddress = uint16(data, 0);
      const quantity = uint16(data, 2);
      validateQuantity(
        quantity,
        1,
        functionCode === 15 ? 1968 : 123,
        "written quantity",
      );
      validateAddressRange(startingAddress, quantity, "written range");
      addAddress(fields, data, 0, "Starting address");
      addWord(fields, data, 2, "Quantity written");
    }
    return;
  }

  if (functionCode === 22) {
    requireExactLength(data, 6, "mask-write message");
    addAddress(fields, data, 0, "Register address");
    addWord(fields, data, 2, "AND mask");
    addWord(fields, data, 4, "OR mask");
    return;
  }

  if (functionCode === 23) {
    if (direction === "request") {
      requireLength(data, 9, "read/write request");
      const readAddress = uint16(data, 0);
      const readQuantity = uint16(data, 2);
      const writeAddress = uint16(data, 4);
      const writeQuantity = uint16(data, 6);
      validateQuantity(readQuantity, 1, 125, "read quantity");
      validateQuantity(writeQuantity, 1, 121, "write quantity");
      validateAddressRange(readAddress, readQuantity, "read range");
      validateAddressRange(writeAddress, writeQuantity, "write range");
      validatePayloadByteCount(
        data,
        8,
        writeQuantity * 2,
        "read/write request",
      );
      addAddress(fields, data, 0, "Read starting address");
      addWord(fields, data, 2, "Quantity to read");
      addAddress(fields, data, 4, "Write starting address");
      addWord(fields, data, 6, "Quantity to write");
      addByteCountAndPayload(fields, data, 8, "Write register values");
    } else {
      addByteCountAndValues(fields, data, "registers");
    }
    return;
  }

  if (functionCode === 7 && direction === "response") {
    requireExactLength(data, 1, "exception status response");
    fields.push({
      bytes: hexByte(data[0]),
      description: "Exception status",
      value: `${numericValue(data[0], 2)} · ${binaryByte(data[0])}`,
    });
    return;
  }

  if (functionCode === 7 && direction === "request") {
    requireExactLength(data, 0, "exception status request");
    return;
  }

  if (functionCode === 8) {
    requireLength(data, 4, "diagnostics message");
    if ((data.length - 2) % 2 !== 0) {
      throw new Error(
        "A diagnostics data field must contain complete 16-bit words",
      );
    }
    addWord(fields, data, 0, "Subfunction");
    fields.push({
      bytes: byteText(data.slice(2)),
      description: "Diagnostic data",
      value: formatPayload(data.slice(2)),
    });
    return;
  }

  if (data.length > 0) {
    fields.push({
      bytes: byteText(data),
      description: "Function data",
      value: formatPayload(data),
    });
  }
}

function addAddress(
  fields: ParsedField[],
  data: number[],
  offset: number,
  description: string,
) {
  const address = uint16(data, offset);
  fields.push({
    bytes: byteText(data.slice(offset, offset + 2)),
    description,
    value: `Physical: ${numericValue(address, 4)} · Logical: ${numericValue(address + 1, 4)}`,
  });
}

function addWord(
  fields: ParsedField[],
  data: number[],
  offset: number,
  description: string,
) {
  const value = uint16(data, offset);
  fields.push({
    bytes: byteText(data.slice(offset, offset + 2)),
    description,
    value: numericValue(value, 4),
  });
}

function addByteCountAndValues(
  fields: ParsedField[],
  data: number[],
  valueType: "bits" | "registers",
) {
  requireLength(data, 1, "read response");
  const count = data[0];
  const payload = data.slice(1);
  if (count < 1 || count > 250) {
    throw new Error(
      `Invalid read response byte count: ${count}; expected a value from 1 to 250`,
    );
  }
  if (count !== payload.length) {
    throw new Error(
      `Invalid byte count: frame declares ${count} bytes, but ${payload.length} follow`,
    );
  }
  if (valueType === "registers" && (count === 0 || count % 2 !== 0)) {
    throw new Error(
      "A register response byte count must be a positive even number",
    );
  }
  fields.push({
    bytes: hexByte(count),
    description: "Byte count",
    value: `${count} · Valid`,
  });
  if (payload.length) {
    const value =
      valueType === "bits"
        ? payload.map((byte) => binaryByteLsbFirst(byte)).join(" ")
        : registerValues(payload);
    fields.push({
      bytes: byteText(payload),
      description:
        valueType === "bits" ? "Bit values (LSB first)" : "Register values",
      value,
    });
  }
}

function addByteCountAndPayload(
  fields: ParsedField[],
  data: number[],
  countOffset: number,
  description: string,
) {
  const count = data[countOffset];
  const payload = data.slice(countOffset + 1);
  fields.push({
    bytes: hexByte(count),
    description: "Byte count",
    value: `${count} · Valid`,
  });
  if (payload.length) {
    fields.push({
      bytes: byteText(payload),
      description,
      value: description.includes("Register")
        ? registerValues(payload)
        : formatPayload(payload),
    });
  }
}

export function parseHexByteInput(raw: string) {
  const compact = raw
    .trim()
    .replace(/0x/gi, "")
    .replace(/[\s,;:_-]+/g, "");
  if (!compact) throw new Error("Enter hexadecimal bytes");
  if (!/^[0-9a-f]+$/i.test(compact)) {
    throw new Error("Use hexadecimal bytes only");
  }
  if (compact.length % 2 !== 0) {
    throw new Error("Each byte must contain two hexadecimal digits");
  }
  return compact.match(/.{2}/g)!.map((value) => Number.parseInt(value, 16));
}

function parseAsciiTextFrame(raw: string) {
  let text = raw.trimStart();
  if (text.endsWith("\\r\\n")) {
    text = text.slice(0, -4);
  } else if (text.endsWith("\r\n")) {
    text = text.slice(0, -2);
  } else {
    throw new Error("A Modbus ASCII frame must end with CRLF");
  }
  if (!text.startsWith(":")) {
    throw new Error("A Modbus ASCII frame must start with a colon");
  }

  const encoded = text.slice(1);
  if (!encoded || !/^[0-9a-f]+$/i.test(encoded)) {
    throw new Error(
      "A Modbus ASCII frame may contain only hexadecimal characters after the colon",
    );
  }
  if (encoded.length % 2 !== 0) {
    throw new Error(
      "A Modbus ASCII frame must contain two characters for each byte",
    );
  }

  const bytes = encoded
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16));
  return {
    bytes,
    normalizedFrame: asciiFrameText(bytes),
  };
}

function isAsciiWireFrame(bytes: number[]) {
  return (
    bytes.length >= 9 &&
    bytes[0] === 0x3a &&
    bytes[bytes.length - 2] === 0x0d &&
    bytes[bytes.length - 1] === 0x0a &&
    bytes.slice(1, -2).every(isAsciiHexCharacter)
  );
}

function parseAsciiWireFrame(wireBytes: number[]) {
  if (!isAsciiWireFrame(wireBytes)) {
    throw new Error("Invalid Modbus ASCII wire frame");
  }
  const text = String.fromCharCode(...wireBytes);
  return parseAsciiTextFrame(text);
}

function isAsciiHexCharacter(value: number) {
  return (
    (value >= 0x30 && value <= 0x39) ||
    (value >= 0x41 && value <= 0x46) ||
    (value >= 0x61 && value <= 0x66)
  );
}

function validateAsciiFrame(bytes: number[], direction: DataDirection) {
  if (bytes.length < 3) {
    throw new Error(
      "Modbus ASCII frames require an address, function code, and LRC",
    );
  }
  if (1 + bytes.length * 2 + 2 > 513) {
    throw new Error("Modbus ASCII frames cannot exceed 513 characters");
  }
  if (bytes[0] > 247) {
    throw new Error("A Modbus ASCII unit address must be between 0 and 247");
  }
  if (direction === "response" && bytes[0] === 0) {
    throw new Error("A Modbus ASCII response cannot use broadcast address 0");
  }

  const receivedLrc = bytes[bytes.length - 1];
  const expectedLrc = calculateModbusLrc(bytes.slice(0, -1));
  if (receivedLrc !== expectedLrc) {
    throw new Error(
      `Invalid Modbus ASCII LRC: received ${hexByte(receivedLrc)}, expected ${hexByte(expectedLrc)}`,
    );
  }
}

function isModbusTcpFrame(bytes: number[]) {
  if (bytes.length < 8 || bytes.length > 260) return false;
  const protocolId = (bytes[2] << 8) | bytes[3];
  const declaredLength = (bytes[4] << 8) | bytes[5];
  return (
    protocolId === 0 &&
    declaredLength >= 2 &&
    declaredLength <= 254 &&
    declaredLength === bytes.length - 6
  );
}

function isModbusRtuFrame(bytes: number[]) {
  if (bytes.length < 4 || bytes.length > 256 || bytes[0] > 247) return false;
  const receivedCrc = bytes[bytes.length - 2] | (bytes[bytes.length - 1] << 8);
  return receivedCrc === calculateModbusCrc(bytes.slice(0, -2));
}

function validateRtuFrame(bytes: number[], direction: DataDirection) {
  if (bytes.length > 256) {
    throw new Error("Modbus RTU frames cannot exceed 256 bytes");
  }
  if (bytes[0] > 247) {
    throw new Error("A Modbus RTU unit address must be between 0 and 247");
  }
  if (direction === "response" && bytes[0] === 0) {
    throw new Error("A Modbus RTU response cannot use broadcast address 0");
  }

  const receivedCrc = bytes[bytes.length - 2] | (bytes[bytes.length - 1] << 8);
  const expectedCrc = calculateModbusCrc(bytes.slice(0, -2));
  if (receivedCrc !== expectedCrc) {
    throw new Error(
      `Invalid Modbus RTU CRC: received ${byteText(bytes.slice(-2))}, expected ${crcBytes(expectedCrc)}`,
    );
  }
}

function validateTcpFrame(bytes: number[]) {
  if (bytes.length > 260) {
    throw new Error("Modbus TCP frames cannot exceed 260 bytes");
  }

  const protocolId = uint16(bytes, 2);
  if (protocolId !== 0) {
    throw new Error(
      `Invalid Modbus TCP protocol identifier: expected 0, received ${protocolId}`,
    );
  }

  const declaredLength = uint16(bytes, 4);
  const actualLength = bytes.length - 6;
  if (declaredLength < 2 || declaredLength > 254) {
    throw new Error(
      `Invalid Modbus TCP length: ${declaredLength}; expected a value from 2 to 254`,
    );
  }
  if (declaredLength !== actualLength) {
    throw new Error(
      `Invalid Modbus TCP length: header declares ${declaredLength} bytes, but ${actualLength} follow`,
    );
  }
}

function requireLength(data: number[], length: number, context: string) {
  if (data.length < length) {
    throw new Error(`The ${context} requires at least ${length} data bytes`);
  }
}

function requireExactLength(data: number[], length: number, context: string) {
  if (data.length !== length) {
    throw new Error(
      `The ${context} requires exactly ${length} data byte${length === 1 ? "" : "s"}; received ${data.length}`,
    );
  }
}

function validateQuantity(
  quantity: number,
  minimum: number,
  maximum: number,
  label: string,
) {
  if (quantity < minimum || quantity > maximum) {
    throw new Error(
      `Invalid ${label}: ${quantity}; expected a value from ${minimum} to ${maximum}`,
    );
  }
}

function validateAddressRange(
  startingAddress: number,
  quantity: number,
  label: string,
) {
  const endingAddress = startingAddress + quantity - 1;
  if (endingAddress > 0xffff) {
    throw new Error(
      `Invalid ${label}: ending address ${endingAddress} exceeds 65535`,
    );
  }
}

function validatePayloadByteCount(
  data: number[],
  countOffset: number,
  expectedCount: number,
  context: string,
) {
  const declaredCount = data[countOffset];
  const actualCount = data.length - countOffset - 1;
  if (declaredCount !== expectedCount) {
    throw new Error(
      `Invalid ${context} byte count: quantity requires ${expectedCount}, but the frame declares ${declaredCount}`,
    );
  }
  if (actualCount !== declaredCount) {
    throw new Error(
      `Invalid ${context} payload: byte count declares ${declaredCount}, but ${actualCount} bytes follow`,
    );
  }
}

function uint16(bytes: number[], offset: number) {
  if (offset + 1 >= bytes.length)
    throw new Error("The frame ends in the middle of a 16-bit value");
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function numericValue(value: number, hexWidth: number) {
  return `0x${value.toString(16).toUpperCase().padStart(hexWidth, "0")} (${value})`;
}

function registerValues(bytes: number[]) {
  const values: string[] = [];
  for (let index = 0; index < bytes.length; index += 2) {
    if (index + 1 < bytes.length) {
      values.push(numericValue(uint16(bytes, index), 4));
    } else {
      values.push(`${hexByte(bytes[index])} (incomplete register)`);
    }
  }
  return values.join(", ");
}

function formatPayload(bytes: number[]) {
  return `${byteText(bytes)} · ${bytes.length} byte${bytes.length === 1 ? "" : "s"}`;
}

function binaryByte(value: number) {
  return value.toString(2).padStart(8, "0");
}

function binaryByteLsbFirst(value: number) {
  return binaryByte(value).split("").reverse().join("");
}

function hexByte(value: number) {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

function byteText(bytes: number[]) {
  return bytes.map(hexByte).join(" ");
}

export function formatHexBytes(bytes: number[]) {
  return byteText(bytes);
}

function asciiFrameText(bytes: number[]) {
  return `:${bytes.map(hexByte).join("")}\\r\\n`;
}

function crcBytes(crc: number) {
  return `${hexByte(crc & 0xff)} ${hexByte(crc >>> 8)}`;
}

export function calculateModbusCrc(bytes: number[]) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }
  return crc & 0xffff;
}

export function calculateModbusLrc(bytes: number[]) {
  const sum = bytes.reduce((total, byte) => (total + byte) & 0xff, 0);
  return -sum & 0xff;
}

export function formatModbusProtocolName(protocol: ModbusProtocol) {
  if (protocol === "rtu") return "Modbus RTU";
  if (protocol === "tcp") return "Modbus TCP";
  return "Modbus ASCII";
}

export function buildModbusReport(result: ModbusParseResult) {
  const header = `${formatModbusProtocolName(result.protocol)} ${result.direction === "request" ? "Request" : "Response"}`;
  return [
    header,
    `Frame: ${result.normalizedFrame}`,
    `Function: 0x${hexByte(result.functionCode)} (${result.functionCode}) - ${result.functionName}`,
    "",
    ...result.fields.map(
      (field) => `${field.description}: ${field.value} [${field.bytes}]`,
    ),
  ].join("\n");
}
