# Modbus Toolkit

Parse, build, decode, and validate Modbus RTU, Modbus TCP, and Modbus ASCII frames directly in Raycast.

## Features

- Parse space-separated, compact, or `0x`-prefixed hexadecimal input.
- Switch between Modbus RTU, Modbus TCP, and Modbus ASCII.
- Interpret request and response payloads for common function codes.
- Show physical (zero-based) and logical (one-based) register and coil addresses.
- Decode register values, bit payloads, exception responses, masks, and diagnostics.
- Validate the Modbus TCP length field, Modbus RTU CRC, and Modbus ASCII LRC.
- Reject frames that unambiguously match another protocol instead of force-parsing them.
- Copy individual fields, a normalized frame, or a complete report.
- Build validated read and write request frames for RTU, TCP, and ASCII.
- Decode UInt16, Int16, UInt32, Int32, Float32, Float64, ASCII, and hexadecimal register values.
- Apply ABCD, CDAB, BADC, and DCBA byte orders when decoding registers.
- Calculate, append, and verify Modbus RTU CRC16 and Modbus ASCII LRC checksums.

## Usage

1. Run `Parse Modbus` in Raycast.
2. Select Modbus RTU, Modbus TCP, or Modbus ASCII.
3. Select whether the frame is a request or response.
4. Paste or enter the complete application data unit (ADU).
5. Parse the frame to inspect every field.

For example, the RTU request `10 06 02 02 00 03 6A F2` writes the value `3` to physical register address `514` (logical address `515`) on slave `16`.

Modbus ASCII accepts the standard text form, such as `:010302580002A0` followed by CRLF. It also accepts a hexadecimal capture of the ASCII wire bytes, including the leading `3A` and trailing `0D 0A`.

The text form must include its CRLF terminator. When entering a visible escaped representation, a trailing literal `\r\n` is accepted as well.

## Commands

- `Parse Modbus` breaks a complete request or response frame into fields.
- `Build Modbus Frame` creates function 01, 02, 03, 04, 05, 06, 15, and 16 request frames with the required transport header and checksum.
- `Decode Register Values` interprets raw register bytes using common numeric and text types with configurable byte order.
- `Calculate Modbus Checksum` calculates and appends a checksum or verifies one already present in a frame.
- `Modbus Reference` provides a searchable guide to data areas, common function codes, data types, byte orders, logical-to-physical addressing, protocol frames, and exception codes.

## Command Examples

- **Parse Modbus:** parse the RTU request `10 06 02 02 00 03 6A F2` as a request.
- **Build Modbus Frame:** select function `03`, unit `1`, starting address `0`, and quantity `2` to generate a complete read request.
- **Decode Register Values:** decode `41 20 00 00` as Float32 with ABCD order to obtain `10`.
- **Calculate Modbus Checksum:** calculate the RTU CRC for `10 06 02 02 00 03` to obtain wire bytes `6A F2`.
- **Modbus Reference:** search by a data area, function code, exception code, data type, or protocol name.

## Structured Parsing Coverage

The parser validates and breaks down the following function codes into named fields:

- `0x01`, `0x02`, `0x03`, and `0x04`: read requests and responses.
- `0x05` and `0x06`: single-write requests and responses.
- `0x07`: exception-status requests and responses.
- `0x08`: diagnostics requests and responses.
- `0x0F` and `0x10`: multiple-write requests and responses.
- `0x16`: mask-write requests and responses.
- `0x17`: read/write-multiple-register requests and responses.
- Exception responses for any function code.

Other function codes remain usable: their function data is displayed as a raw payload instead of being split into function-specific fields.

Because RTU has no header, a short byte sequence can occasionally satisfy both a valid RTU CRC and the byte layout of a valid TCP frame. In that inherently ambiguous case, the parser honors the protocol selected by the user. It suggests another protocol only when the selected framing fails and the other framing validates.

Modbus natively defines bits and 16-bit registers. Signed integers, 32-bit or 64-bit values, floating-point values, strings, and multi-register byte order are device conventions. Always confirm them in the device documentation.

## Reference

This extension's input flow and field-oriented result presentation are explicitly based on the [Rapid SCADA Modbus Parser](https://rapidscada.net/modbus/). Frame structure, size, MBAP header, length, and unit-address validation follow the [Fernhill Software Modbus Protocol guide](https://www.fernhillsoftware.com/help/drivers/modbus/modbus-protocol.html). Function-code limits and data encoding follow the [Modbus Application Protocol Specification V1.1b3](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf), while CRC and LRC generation follow the [Modbus Serial Line Protocol and Implementation Guide V1.02](https://www.modbus.org/file/secure/modbusoverserial.pdf). The implementation runs locally in Raycast and does not send entered frames to any website.

Modbus is a registered trademark of Schneider Electric. This extension is an independent developer tool and is not affiliated with Rapid SCADA or Schneider Electric.
