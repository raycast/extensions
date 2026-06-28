# BinTools

A [raycast](https://raycast.com/) calculator plugin for binary, decimal, hex and octal numbers.

## Usage

Enter your calculation in the text field, by using the following prefixes for the different number systems:

- `0b` for binary
- `0x` for hexadecimal
- `0o` for octal

The result will be calculated on the fly and displayed live under your calculation.
If you want to calculate floating point numbers, you can use the `.` or `,` as decimal separator.
Currently only decimal and binary fixed point numbers are supported as input.

### Examples

- `0b101 + 0x1` will result in `0b110` or `6` in decimal
- `0b0101+0o5-0xf` will result in `-0b101?` or `-5` in decimal
- `0b0.1` will result in `0.5` in decimal
