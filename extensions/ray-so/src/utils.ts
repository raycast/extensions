/**
 * Encodes a string to a URL-safe base64 format for ray.so
 * @param text - The text to encode
 * @returns URL-safe base64 encoded string
 */
export function encodeForRayso(text: string): string {
  return Buffer.from(text, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function createRaySoUrl({
  code,
  theme,
  padding,
  darkMode,
  background,
  title,
  language,
}: {
  code: string;
  theme: string;
  padding: string;
  darkMode: boolean;
  background: boolean;
  title?: string;
  language?: string;
}): string {
  const parameters = new URLSearchParams({
    theme,
    background: String(background),
    darkMode: String(darkMode),
    padding,
    code: encodeForRayso(code),
  });
  if (title !== undefined) parameters.set("title", title);
  if (language !== undefined) parameters.set("language", language);
  return `https://ray.so/#${parameters.toString()}`;
}
