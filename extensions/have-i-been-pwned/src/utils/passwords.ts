import { pwnedPasswordsFetch } from "./api";

export async function checkPasswordHash(hash: string): Promise<number> {
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const body = await pwnedPasswordsFetch(prefix);

  for (const line of body.split("\r\n")) {
    const [lineSuffix, countStr] = line.split(":");
    if (lineSuffix === suffix) {
      return parseInt(countStr, 10);
    }
  }

  return 0;
}

export function hashPassword(password: string): string {
  const bytes = utf8Bytes(password);
  const words = new Array<number>((((bytes.length + 8) >> 6) + 1) * 16).fill(0);

  for (let index = 0; index < bytes.length; index++) {
    words[index >> 2] |= bytes[index] << (24 - (index % 4) * 8);
  }

  words[bytes.length >> 2] |= 0x80 << (24 - (bytes.length % 4) * 8);
  words[words.length - 1] = bytes.length * 8;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < words.length; offset += 16) {
    const w = words.slice(offset, offset + 16);

    for (let index = 16; index < 80; index++) {
      w[index] = leftRotate(w[index - 3] ^ w[index - 8] ^ w[index - 14] ^ w[index - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index++) {
      let f = 0;
      let k = 0;

      if (index < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (index < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (leftRotate(a, 5) + f + e + k + w[index]) >>> 0;
      e = d;
      d = c;
      c = leftRotate(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return [h0, h1, h2, h3, h4]
    .map((part) => part.toString(16).padStart(8, "0"))
    .join("")
    .toUpperCase();
}

function leftRotate(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];

  for (const character of text) {
    const codePoint = character.codePointAt(0);

    if (codePoint === undefined) continue;

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return bytes;
}
