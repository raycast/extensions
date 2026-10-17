// Character mappings for slugification
const CHAR_MAP: Record<string, string> = {
  // á à â ä æ ã å ā → a
  á: "a",
  à: "a",
  â: "a",
  ä: "a",
  æ: "a",
  ã: "a",
  å: "a",
  ā: "a",
  Á: "a",
  À: "a",
  Â: "a",
  Ä: "a",
  Æ: "a",
  Ã: "a",
  Å: "a",
  Ā: "a",

  // é è ê ë ē ė ę → e
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  ē: "e",
  ė: "e",
  ę: "e",
  É: "e",
  È: "e",
  Ê: "e",
  Ë: "e",
  Ē: "e",
  Ė: "e",
  Ę: "e",

  // í ì î ï ī į → i
  í: "i",
  ì: "i",
  î: "i",
  ï: "i",
  ī: "i",
  į: "i",
  ı: "i",
  İ: "i",
  Í: "i",
  Ì: "i",
  Î: "i",
  Ï: "i",
  Ī: "i",
  Į: "i",
  I: "i",

  // ó ò ô ö œ õ ø ō → o
  ó: "o",
  ò: "o",
  ô: "o",
  ö: "o",
  œ: "o",
  õ: "o",
  ø: "o",
  ō: "o",
  Ó: "o",
  Ò: "o",
  Ô: "o",
  Ö: "o",
  Œ: "o",
  Õ: "o",
  Ø: "o",
  Ō: "o",

  // ú ù û ü ū → u
  ú: "u",
  ù: "u",
  û: "u",
  ü: "u",
  ū: "u",
  Ú: "u",
  Ù: "u",
  Û: "u",
  Ü: "u",
  Ū: "u",

  // c variants
  ç: "c",
  Ç: "c",

  // g variants
  ğ: "g",
  Ğ: "g",

  // s variants
  ş: "s",
  Ş: "s",

  // Other special characters
  ñ: "n",
  Ñ: "n",
  ß: "ss",
  ý: "y",
  Ý: "y",
  ž: "z",
  Ž: "z",
};

// German-specific character mappings with proper transliterations
const GERMAN_CHAR_MAP: Record<string, string> = {
  // German umlauts with proper transliterations
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",

  // Keep all other character mappings from default map
  ...CHAR_MAP,
};

/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to slugify
 * @param options - Slugify options
 * @returns The slugified string
 */
export function slugify(
  text: string,
  options: { preserveExtension?: boolean; useGermanTranslation?: boolean } = {},
): string {
  if (!text) return "";

  let slug = text;
  let extension = "";

  // Preserve file extension if requested
  if (options.preserveExtension) {
    const lastDotIndex = text.lastIndexOf(".");
    if (lastDotIndex > 0 && lastDotIndex < text.length - 1) {
      extension = text.substring(lastDotIndex);
      slug = text.substring(0, lastDotIndex);
    }
  }

  // Choose character mapping based on German umlaut transliteration option
  const charMap = options.useGermanTranslation ? GERMAN_CHAR_MAP : CHAR_MAP;

  // Apply character mappings
  slug = slug
    .split("")
    .map((char) => charMap[char] || char)
    .join("");

  // Convert to lowercase
  slug = slug.toLowerCase();

  // Replace spaces and other separators with hyphens
  slug = slug.replace(/[\s/_\\]+/g, "-");

  // Remove punctuation and special characters, keeping only alphanumeric and hyphens
  slug = slug.replace(/[^a-z0-9-]/g, "");

  // Replace multiple consecutive hyphens with single hyphen
  slug = slug.replace(/-+/g, "-");

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-+|-+$/g, "");

  // If slug is empty after processing, use a fallback
  if (!slug) {
    slug = "untitled";
  }

  return slug + extension;
}

/**
 * Generates a safe filename by slugifying and handling potential conflicts
 * @param originalName - The original filename
 * @param preserveExtension - Whether to preserve the file extension
 * @param useGermanTranslation - Whether to use German umlaut transliterations
 * @returns The slugified filename
 */
export function generateSlugFilename(
  originalName: string,
  preserveExtension: boolean = true,
  useGermanTranslation: boolean = false,
): string {
  return slugify(originalName, { preserveExtension, useGermanTranslation });
}
