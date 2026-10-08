const BASE32_CHARS = "0123456789abcdefghijklmnopqrstuv";

export function decodeBase32(input: string): string {
  const bytes = [];
  let shift = 8;
  let carry = 0;

  for (const char of input) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }

    if (shift >= 5) {
      shift -= 5;
      carry |= index << shift;
    } else {
      carry |= index >> (5 - shift);
      bytes.push(carry);
      shift += 3;
      carry = (index << shift) & 255;
    }
  }

  if (shift !== 8 && carry !== 0) {
    bytes.push(carry);
  }

  return String.fromCharCode(...bytes);
}
