export function validateUrl(url: string, label: string): void {
  if (!url || url.trim() === "") {
    throw new Error(`${label} is required and cannot be empty`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid ${label} format: "${url}" is not a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Invalid ${label} protocol: URL must use HTTP or HTTPS (got ${parsed.protocol})`,
    );
  }
}
