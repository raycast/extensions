export type Base64Mode = "encode" | "decode";

export function convertBase64(input: string, mode: Base64Mode): string {
  if (mode === "encode") {
    return Buffer.from(input, "utf8").toString("base64");
  }

  return decodeBase64(input);
}

function decodeBase64(input: string): string {
  const normalized = input.replace(/\s/g, "");

  if (!isBase64Text(normalized)) {
    throw new Error("Invalid Base64 input");
  }

  return Buffer.from(normalized, "base64").toString("utf8");
}

function isBase64Text(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) {
    return false;
  }

  return /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}
