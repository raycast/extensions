const crockford = "0123456789abcdefghijklmnopqrstuv";
const padding = "=".charCodeAt(0);
const codebook = new Array(32);

for (let i = 0; i < 32; i += 1) {
  codebook[i] = crockford.charCodeAt(i);
}

function pad(buff: Buffer, ptr: number, trailing: number) {
  let len = 8;
  buff[ptr + 7] = padding;
  if (trailing < 4) {
    buff[ptr + 6] = padding;
    buff[ptr + 5] = padding;
    len -= 2;
    if (trailing < 3) {
      buff[ptr + 4] = padding;
      len -= 1;
      if (trailing < 2) {
        buff[ptr + 3] = padding;
        buff[ptr + 2] = padding;
        len -= 2;
      }
    }
  }
  return len;
}

function encodeLength(n: number) {
  const len = n / 5;
  const precise = len | 0;
  if (len === precise) {
    return len * 8;
  }
  return (precise + 1) * 8;
}

function wrap(input: Buffer | string) {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  return Buffer.from(input);
}

/**
 * Convert an input to an base32 encoded Buffer output.
 *
 * @param {Buffer|ArrayBuffer|Array|string} input
 * @returns {Buffer}
 */
function encode(input: Buffer | string) {
  const src = wrap(input);
  const len = src.length;
  if (len === 0) {
    return Buffer.alloc(0);
  }
  const dst = Buffer.allocUnsafe(encodeLength(len));

  let offset = 0;
  let written = 0;

  while (offset < len) {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    let b7 = 0;
    const remain = len - offset;
    switch (remain) {
      default:
        b7 = src[offset + 4] & 0x1f;
        b6 = src[offset + 3] >> 5;
      // fallthrough
      case 4:
        b6 |= (src[offset + 3] << 3) & 0x1f;
        b5 = (src[offset + 3] >> 2) & 0x1f;
        b4 = src[offset + 3] >> 7;
      // fallthrough
      case 3:
        b4 |= (src[offset + 2] << 1) & 0x1f;
        b3 = (src[offset + 2] >> 4) & 0x1f;
      // fallthrough
      case 2:
        b3 |= (src[offset + 1] << 4) & 0x1f;
        b2 = (src[offset + 1] >> 1) & 0x1f;
        b1 = (src[offset + 1] >> 6) & 0x1f;
      // fallthrough
      case 1:
        b1 |= (src[offset] << 2) & 0x1f;
        b0 = src[offset] >> 3;
    }

    dst[written] = codebook[b0];
    dst[written + 1] = codebook[b1];
    dst[written + 2] = codebook[b2];
    dst[written + 3] = codebook[b3];
    dst[written + 4] = codebook[b4];
    dst[written + 5] = codebook[b5];
    dst[written + 6] = codebook[b6];
    dst[written + 7] = codebook[b7];

    if (remain < 5) {
      written += pad(dst, written, remain);
      break;
    }
    written += 8;
    offset += 5;
  }
  return dst.slice(0, written);
}

/**
 * Convert an input to base32 encoded string output.
 *
 * @param {Buffer|ArrayBuffer|Array|string} input
 * @returns {string|String}
 */
export function encodeString(input: Buffer | string): string {
  return encode(input).toString("ascii");
}
