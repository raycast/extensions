# Bit Parser

Inspect individual bits in fault codes, status words, and flags. Bit Parser accepts decimal, hexadecimal, and binary values and shows every bit set to `1` before the complete bit list.

## Features

- Parse 8, 16, 32, or 64-bit values.
- Enter decimal, hexadecimal, or binary values.
- Display high bits or low bits first.
- See all bits set to `1` without configuring labels.
- Add optional labels for known faults or states.
- Copy or paste individual bits and complete reports.

## Usage

1. Open the `Parse Bits` command. You can also pass a value as an argument or from selected text.
2. Enter a value such as `33027`, `0x8103`, or `0b1000000100000011`.
3. Select the number base, bit width, and display order.
4. Optionally add bit labels.
5. Run the command to inspect the active and inactive bits.
6. Return to the input form to adjust the value or options and parse again.

Auto Detect recognizes hexadecimal values with a `0x` prefix and binary values with a `0b` prefix. Values without a prefix are treated as decimal. Select Binary or Hexadecimal explicitly to enter an unprefixed value in either base.

## Bit Labels

Labels are optional and empty by default. Add one definition per line when you want the result to include fault or state names:

```text
0=Emergency stop
1: Overvoltage
bit2 Undervoltage
8=Communication fault
```

`bit0` always represents the least significant bit. The bit order setting only changes the display order.
