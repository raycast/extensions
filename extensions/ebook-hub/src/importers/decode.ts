/** Decode text files, honoring UTF-8 and UTF-16 byte order marks. */
export function decodeText(data: Uint8Array): string {
  let text: string;
  if (data[0] === 0xff && data[1] === 0xfe) {
    text = new TextDecoder("utf-16le").decode(data.subarray(2));
  } else if (data[0] === 0xfe && data[1] === 0xff) {
    text = new TextDecoder("utf-16be").decode(data.subarray(2));
  } else {
    text = new TextDecoder("utf-8").decode(data);
  }
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .normalize("NFC");
}
