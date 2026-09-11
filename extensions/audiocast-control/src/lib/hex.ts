export function fromHexToString(hex: string): string {
  return Buffer.from(hex, "hex").toString("utf-8");
}
