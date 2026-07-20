export type TranslationFunction = (searchText?: string, count?: number) => string;
export type TranslationValue = string | TranslationFunction;
export type TranslationsObject = { [key: string]: TranslationValue | TranslationsObject };

function isTranslationFunction(value: unknown): value is TranslationFunction {
  return typeof value === "function";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isTranslationsObject(value: unknown): value is TranslationsObject {
  return typeof value === "object" && value !== null;
}

export function translate(
  translationsForLanguage: unknown,
  key: string,
  params?: {
    searchText?: string;
    count?: number;
    [key: string]: string | number | undefined;
  },
): string {
  const keys = key.split(".");
  let current: unknown = translationsForLanguage;

  for (const k of keys) {
    if (isTranslationsObject(current) && k in current) {
      current = current[k];
    } else {
      return key;
    }
  }

  if (isTranslationFunction(current)) {
    return current(params?.searchText, params?.count);
  }

  if (isString(current)) {
    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, value]) => str.replaceAll(`{{${paramKey}}}`, String(value)),
        current,
      );
    }
    return current;
  }

  return key;
}
