export function decode(text: string): string {
  return Buffer.from(text, "base64").toString();
}

export function encode(text: string): string {
  return Buffer.from(text).toString("base64");
}
