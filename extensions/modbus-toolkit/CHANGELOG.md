# Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Parse Modbus RTU, Modbus TCP, and Modbus ASCII requests and responses.
- Decode common read, write, diagnostic, mask-write, and exception messages.
- Display physical and logical addresses in a field-oriented result list.
- Validate RTU CRC values and TCP length fields.
- Reject unambiguous RTU, TCP, and ASCII protocol mismatches before parsing.
- Validate Modbus ASCII framing, size, address, and LRC.
- Validate function-specific lengths, quantities, byte counts, payload sizes, and address ranges.
- Reject exception frames parsed as requests and broadcast-address responses.
- Build Modbus RTU, TCP, and ASCII read and write request frames.
- Decode register bytes as integer, floating-point, ASCII, or hexadecimal values with common byte orders.
- Calculate, append, and verify Modbus RTU CRC16 and Modbus ASCII LRC checksums.
- Look up Modbus data areas, common function codes, register value types, addressing rules, protocol frames, and exception codes.
- Copy parsed fields, normalized frames, and complete reports.
