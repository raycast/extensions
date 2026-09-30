import { Action, ActionPanel, Icon, List } from "@raycast/api";

type ReferenceItem = {
  title: string;
  subtitle: string;
  keywords: string[];
  markdown: string;
};

const DATA_MODEL: ReferenceItem[] = [
  {
    title: "Coils",
    subtitle: "Read/write single-bit outputs · 00001 range",
    keywords: ["coil", "output", "bit", "00001", "01", "05", "0f"],
    markdown: `# Coils

Coils are single-bit outputs that can be read and written.

| Operation | Function Code |
| --- | --- |
| Read coils | \`01 (0x01)\` |
| Write one coil | \`05 (0x05)\` |
| Write multiple coils | \`15 (0x0F)\` |

The common logical notation starts at **00001**, while the address encoded in the Modbus PDU starts at **0**.

Example: logical coil **00101** is encoded as physical address **100 (0x0064)**.`,
  },
  {
    title: "Discrete Inputs",
    subtitle: "Read-only single-bit inputs · 10001 range",
    keywords: ["discrete", "input", "bit", "10001", "02"],
    markdown: `# Discrete Inputs

Discrete Inputs are single-bit inputs that can only be read.

| Operation | Function Code |
| --- | --- |
| Read discrete inputs | \`02 (0x02)\` |

The common logical notation starts at **10001**, while the address encoded in the Modbus PDU starts at **0**.

Example: logical input **10501** is encoded as physical address **500 (0x01F4)**.`,
  },
  {
    title: "Input Registers",
    subtitle: "Read-only 16-bit registers · 30001 range",
    keywords: ["input", "register", "readonly", "30001", "04"],
    markdown: `# Input Registers

Input Registers are read-only 16-bit values.

| Operation | Function Code |
| --- | --- |
| Read input registers | \`04 (0x04)\` |

The common logical notation starts at **30001**, while the address encoded in the Modbus PDU starts at **0**.

Example: logical register **30201** is encoded as physical address **200 (0x00C8)**.`,
  },
  {
    title: "Holding Registers",
    subtitle: "Read/write 16-bit registers · 40001 range",
    keywords: ["holding", "register", "40001", "03", "06", "10", "16", "17"],
    markdown: `# Holding Registers

Holding Registers are 16-bit values that can be read and written.

| Operation | Function Code |
| --- | --- |
| Read holding registers | \`03 (0x03)\` |
| Write one register | \`06 (0x06)\` |
| Write multiple registers | \`16 (0x10)\` |
| Mask write register | \`22 (0x16)\` |
| Read/write multiple registers | \`23 (0x17)\` |

The common logical notation starts at **40001**, while the address encoded in the Modbus PDU starts at **0**.

Example: logical register **40101** is encoded as physical address **100 (0x0064)**.`,
  },
];

const FUNCTION_CODES: ReferenceItem[] = [
  functionItem(
    "01 (0x01)",
    "Read Coils",
    "Coils",
    "1–2000 coils",
    "Starting address + quantity",
  ),
  functionItem(
    "02 (0x02)",
    "Read Discrete Inputs",
    "Discrete Inputs",
    "1–2000 inputs",
    "Starting address + quantity",
  ),
  functionItem(
    "03 (0x03)",
    "Read Holding Registers",
    "Holding Registers",
    "1–125 registers",
    "Starting address + quantity",
  ),
  functionItem(
    "04 (0x04)",
    "Read Input Registers",
    "Input Registers",
    "1–125 registers",
    "Starting address + quantity",
  ),
  functionItem(
    "05 (0x05)",
    "Write Single Coil",
    "Coils",
    "One coil",
    "Coil address + FF00 for ON or 0000 for OFF",
  ),
  functionItem(
    "06 (0x06)",
    "Write Single Register",
    "Holding Registers",
    "One register",
    "Register address + 16-bit value",
  ),
  functionItem(
    "15 (0x0F)",
    "Write Multiple Coils",
    "Coils",
    "1–1968 coils",
    "Starting address + quantity + byte count + packed bits",
  ),
  functionItem(
    "16 (0x10)",
    "Write Multiple Registers",
    "Holding Registers",
    "1–123 registers",
    "Starting address + quantity + byte count + register values",
  ),
  functionItem(
    "22 (0x16)",
    "Mask Write Register",
    "Holding Registers",
    "One register",
    "Register address + AND mask + OR mask",
  ),
  functionItem(
    "23 (0x17)",
    "Read/Write Multiple Registers",
    "Holding Registers",
    "Read 1–125; write 1–121 registers",
    "Read range + write range + write values",
  ),
];

const DATA_TYPES: ReferenceItem[] = [
  dataTypeItem(
    "Bit / Boolean",
    "1 bit",
    "Modbus native",
    "Used by Coils and Discrete Inputs. A value is either OFF (0) or ON (1).",
    ["coil", "discrete input", "boolean", "bool"],
  ),
  dataTypeItem(
    "UInt16",
    "1 register · 16 bits",
    "Modbus native register value",
    "An unsigned value from 0 to 65535. Register bytes are transmitted most-significant byte first.",
    ["unsigned", "word", "register"],
  ),
  dataTypeItem(
    "Int16",
    "1 register · 16 bits",
    "Device convention",
    "A signed two's-complement value from -32768 to 32767.",
    ["signed", "short", "two's complement"],
  ),
  dataTypeItem(
    "UInt32 / Int32",
    "2 registers · 32 bits",
    "Device convention",
    "Two consecutive registers are combined into an unsigned or signed 32-bit integer. The device manual must define the word order.",
    ["uint32", "int32", "dword", "integer"],
  ),
  dataTypeItem(
    "Float32",
    "2 registers · 32 bits",
    "Device convention",
    "Two consecutive registers commonly encode an IEEE 754 single-precision value. Byte and word order are device-specific.",
    ["float", "real", "ieee 754", "single"],
  ),
  dataTypeItem(
    "Float64",
    "4 registers · 64 bits",
    "Device convention",
    "Four consecutive registers commonly encode an IEEE 754 double-precision value. Byte and word order are device-specific.",
    ["double", "ieee 754", "64 bit"],
  ),
  dataTypeItem(
    "ASCII / String",
    "One or more registers",
    "Device convention",
    "Each 16-bit register usually contains two characters. Null termination, padding, length, and character order depend on the device.",
    ["text", "characters", "string", "encoding"],
  ),
  {
    title: "Byte and Word Order",
    subtitle: "ABCD, CDAB, BADC, and DCBA",
    keywords: [
      "byte order",
      "word order",
      "endianness",
      "abcd",
      "cdab",
      "badc",
      "dcba",
    ],
    markdown: `# Byte and Word Order

Modbus transmits each 16-bit register with its most-significant byte first. The order used when a device combines multiple registers is not defined by the protocol.

Common 32-bit layouts are:

| Layout | Meaning |
| --- | --- |
| ABCD | Big endian |
| CDAB | Word swapped |
| BADC | Bytes swapped inside each word |
| DCBA | Little endian |

Example: the Float32 value **10.0** is encoded as IEEE 754 bytes \`41 20 00 00\` in ABCD order.

Use **Decode Register Values** and select the layout documented by the device manufacturer.`,
  },
];

const ADDRESSING: ReferenceItem[] = [
  {
    title: "Logical vs. Physical Address",
    subtitle: "Reference numbers are not transmitted on the wire",
    keywords: ["logical", "physical", "offset", "zero based", "one based"],
    markdown: `# Logical vs. Physical Address

Modbus PDUs contain a **zero-based 16-bit physical address** from \`0\` to \`65535\`.

Prefixes such as **0xxxx**, **1xxxx**, **3xxxx**, and **4xxxx** are common documentation conventions. The prefix identifies the data area and is not transmitted in the PDU.

| Logical Reference | Data Area | PDU Address |
| --- | --- | ---: |
| 00001 | Coil | 0 |
| 10001 | Discrete Input | 0 |
| 30001 | Input Register | 0 |
| 40001 | Holding Register | 0 |
| 40101 | Holding Register | 100 (0x0064) |

Always check whether a device manual lists addresses as zero-based offsets or one-based reference numbers.`,
  },
];

const PROTOCOLS: ReferenceItem[] = [
  {
    title: "Modbus RTU",
    subtitle: "Binary serial frame · CRC16",
    keywords: ["rtu", "serial", "crc", "rs485", "rs232", "256"],
    markdown: `# Modbus RTU

Modbus RTU transmits each message as a compact binary frame.

| Field | Size |
| --- | ---: |
| Unit address | 1 byte |
| PDU | Up to 253 bytes |
| CRC16 | 2 bytes |

The maximum frame size is **256 bytes**. The CRC covers the Unit Address and the complete PDU. Its **low-order byte is transmitted first**, followed by the high-order byte.

Serial unit addresses range from **1 to 247**. Address **0** is a broadcast request and does not receive a response.`,
  },
  {
    title: "Modbus TCP",
    subtitle: "MBAP header over TCP/IP · no CRC",
    keywords: ["tcp", "mbap", "transaction", "protocol id", "length", "260"],
    markdown: `# Modbus TCP

Modbus TCP adds a 7-byte MBAP header before the PDU.

| Field | Size |
| --- | ---: |
| Transaction identifier | 2 bytes |
| Protocol identifier | 2 bytes; must be 0 |
| Length | 2 bytes |
| Unit identifier | 1 byte |
| PDU | Up to 253 bytes |

The Length field counts every byte that follows it: **Unit Identifier + PDU**. The maximum complete frame size is **260 bytes**.

TCP already provides transport error detection, so a standard Modbus TCP frame does **not** contain an RTU CRC.`,
  },
  {
    title: "Modbus ASCII",
    subtitle: "Hexadecimal text serial frame · LRC",
    keywords: ["ascii", "serial", "colon", "crlf", "lrc", "513"],
    markdown: `# Modbus ASCII

Modbus ASCII represents every message byte as two hexadecimal ASCII characters.

| Field | Format |
| --- | --- |
| Start | Colon \`:\` |
| Unit address + PDU | Hexadecimal character pairs |
| LRC | Two hexadecimal characters |
| End | CRLF |

The maximum frame size is **513 characters**. The LRC is calculated from the decoded Unit Address and PDU bytes; the starting colon and ending CRLF are excluded.

Serial unit addresses range from **1 to 247**. Address **0** is a broadcast request and does not receive a response.`,
  },
  {
    title: "Requests and Responses",
    subtitle: "Client request, server response, or exception response",
    keywords: ["request", "response", "client", "server", "transaction"],
    markdown: `# Requests and Responses

Modbus is a client/server request-response protocol.

1. The client sends a request containing a function code and function data.
2. The server returns a normal response with the same function code, or an exception response.
3. A serial broadcast request sent to unit address **0** is processed without a response.

For Modbus TCP, the response copies the request's Transaction Identifier so the client can match the two messages.`,
  },
];

const EXCEPTIONS: ReferenceItem[] = [
  {
    title: "Exception Response Format",
    subtitle: "Function code + 0x80 followed by one exception code",
    keywords: ["exception", "error", "response", "80", "function code"],
    markdown: `# Exception Response Format

When a server rejects a validly received request, it returns an exception response:

- The response function code is the request function code with bit 7 set: **Function Code + 0x80**.
- The next byte is the exception code.

Example: a Read Holding Registers request uses function \`03\`. An exception response with function \`83\` and code \`02\` means **Illegal Data Address**.`,
  },
  exceptionItem(
    "01",
    "Illegal Function",
    "The server does not support the requested function code.",
  ),
  exceptionItem(
    "02",
    "Illegal Data Address",
    "The requested address or address range is not available on the server.",
  ),
  exceptionItem(
    "03",
    "Illegal Data Value",
    "A request field contains a value that is not allowed, such as an invalid quantity.",
  ),
  exceptionItem(
    "04",
    "Server Device Failure",
    "The server encountered an unrecoverable error while processing the request.",
  ),
  exceptionItem(
    "05",
    "Acknowledge",
    "The server accepted a long-running operation, but processing is not yet complete.",
  ),
  exceptionItem(
    "06",
    "Server Device Busy",
    "The server is processing another long-running operation; retry the request later.",
  ),
  exceptionItem(
    "08",
    "Memory Parity Error",
    "The server detected a parity error while accessing extended memory.",
  ),
  exceptionItem(
    "0A",
    "Gateway Path Unavailable",
    "A gateway could not allocate or use the path required to reach the target device.",
  ),
  exceptionItem(
    "0B",
    "Gateway Target Device Failed to Respond",
    "A gateway did not receive a response from the target device.",
  ),
];

export default function Command() {
  return (
    <List
      isShowingDetail
      navigationTitle="Modbus Reference"
      searchBarPlaceholder="Search Modbus concepts, codes, or addresses"
    >
      <ReferenceSection title="Data Model" items={DATA_MODEL} />
      <ReferenceSection title="Function Codes" items={FUNCTION_CODES} />
      <ReferenceSection title="Data Types" items={DATA_TYPES} />
      <ReferenceSection title="Addressing" items={ADDRESSING} />
      <ReferenceSection title="Protocol" items={PROTOCOLS} />
      <ReferenceSection title="Exceptions" items={EXCEPTIONS} />
    </List>
  );
}

function ReferenceSection({
  title,
  items,
}: {
  title: string;
  items: ReferenceItem[];
}) {
  return (
    <List.Section title={title}>
      {items.map((item) => (
        <List.Item
          key={item.title}
          title={item.title}
          subtitle={item.subtitle}
          keywords={item.keywords}
          icon={Icon.Book}
          detail={<List.Item.Detail markdown={item.markdown} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Reference"
                content={plainText(item.markdown)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

function functionItem(
  code: string,
  name: string,
  dataArea: string,
  limit: string,
  request: string,
): ReferenceItem {
  return {
    title: `${code} · ${name}`,
    subtitle: `${dataArea} · ${limit}`,
    keywords: [code, name, dataArea, limit],
    markdown: `# ${name}

| Property | Value |
| --- | --- |
| Function code | **${code}** |
| Data area | ${dataArea} |
| Limit | ${limit} |
| Request data | ${request} |

Addresses in the request are zero-based physical addresses.`,
  };
}

function exceptionItem(
  code: string,
  name: string,
  description: string,
): ReferenceItem {
  return {
    title: `${code} · ${name}`,
    subtitle: description,
    keywords: [code, name, "exception", "error"],
    markdown: `# ${name}

| Property | Value |
| --- | --- |
| Exception code | **${code} (0x${code})** |
| Meaning | ${description} |

The exception code follows a response function code whose high bit is set.`,
  };
}

function dataTypeItem(
  name: string,
  size: string,
  category: string,
  description: string,
  keywords: string[],
): ReferenceItem {
  return {
    title: name,
    subtitle: `${size} · ${category}`,
    keywords: [name, size, category, ...keywords],
    markdown: `# ${name}

| Property | Value |
| --- | --- |
| Size | ${size} |
| Category | ${category} |

${description}

Only Bit and 16-bit Register storage are defined by the Modbus data model. Multi-register numeric and text representations must be confirmed in the device documentation.`,
  };
}

function plainText(markdown: string) {
  return markdown
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#\s+/gm, "")
    .trim();
}
