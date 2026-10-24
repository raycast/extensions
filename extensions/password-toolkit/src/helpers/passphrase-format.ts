const placeholderPattern = /{([^{}]*)}/g;
const wordModifiers = new Set(["uppercase", "lowercase", "capitalize"]);

export type PassphrasePreferenceValues = {
  wordCount?: string;
  capitalize?: boolean;
  includeNumber?: boolean;
  wordSeparatorPreset?: string;
  customWordSeparator?: string;
  customFormatPreset?: string;
  customFormat?: string;
};

export type PassphraseOptions = {
  wordCount: number;
  capitalize: boolean;
  includeNumber: boolean;
  wordSeparator: string;
};

type CustomFormatPresetBuilder = (options: PassphraseOptions) => string;

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
  wordCount: 6,
  capitalize: true,
  includeNumber: true,
  wordSeparator: "-",
};

export const DEFAULT_PASSPHRASE_FORMAT = buildPassphraseFormat(DEFAULT_PASSPHRASE_OPTIONS);
export const SETTINGS_FORMAT_PRESET = "settings";
export const SETTINGS_WORD_SEPARATOR_PRESET = "settings";
export const CUSTOM_FORMAT_FIELD_PRESET = "custom";
export const CUSTOM_WORD_SEPARATOR_PRESET = "custom";

const wordSeparatorPresets: Record<string, string> = {
  hyphen: "-",
  space: " ",
  period: ".",
  comma: ",",
  underscore: "_",
  none: "",
};

const customFormatPresetBuilders: Record<string, CustomFormatPresetBuilder> = {
  "words-one-digit": ({ wordCount, wordSeparator }) =>
    buildWordSeries(wordCount, "{word:capitalize}", wordSeparator, "{number:random}"),
  "words-only": ({ wordCount, wordSeparator }) => buildWordSeries(wordCount, "{word:capitalize}", wordSeparator),
  "lowercase-words": ({ wordCount, wordSeparator }) => buildWordSeries(wordCount, "{word:lowercase}", wordSeparator),
  "words-four-digits": ({ wordCount, wordSeparator }) =>
    joinFormatParts([buildWordSeries(wordCount, "{word:capitalize}", wordSeparator), "{number:4}"], wordSeparator),
  "underscore-one-digit": ({ wordCount }) => buildWordSeries(wordCount, "{word:capitalize}", "_", "{number:random}"),
  "dot-symbols": ({ wordCount }) =>
    joinFormatParts([buildWordSeries(wordCount, "{word:lowercase}", "."), "{symbol:2}"], "."),
  "compact-digits": ({ wordCount }) => `${buildWordSeries(wordCount, "{word:capitalize}", "")}{number:4}`,
  "random-middle": ({ wordCount, wordSeparator }) =>
    joinFormatParts(
      [
        "{word:capitalize}",
        "{random:8}",
        wordCount > 1 ? buildWordSeries(wordCount - 1, "{word:capitalize}", wordSeparator) : undefined,
      ],
      wordSeparator,
    ),
  "uppercase-code": ({ wordCount, wordSeparator }) =>
    joinFormatParts(
      [buildWordSeries(wordCount, "{word:uppercase}", wordSeparator), "{number:4}", "{symbol:2}"],
      wordSeparator,
    ),
  "words-two-symbols": ({ wordCount, wordSeparator }) =>
    joinFormatParts([buildWordSeries(wordCount, "{word:capitalize}", wordSeparator), "{symbol:2}"], wordSeparator),
};

export function resolvePassphraseFormat(preferences: PassphrasePreferenceValues = {}): string {
  const preset = preferences.customFormatPreset?.trim() || SETTINGS_FORMAT_PRESET;

  if (preset === SETTINGS_FORMAT_PRESET) {
    return buildPassphraseFormat(resolvePassphraseOptions(preferences));
  }

  if (preset === CUSTOM_FORMAT_FIELD_PRESET) {
    return expandWordsMacro(preferences.customFormat?.trim() || DEFAULT_PASSPHRASE_FORMAT, preferences);
  }

  return buildCustomFormatPreset(preset, preferences);
}

export function resolvePassphraseOptions(preferences: PassphrasePreferenceValues = {}): PassphraseOptions {
  return {
    wordCount: resolveWordCount(preferences.wordCount),
    capitalize: preferences.capitalize ?? DEFAULT_PASSPHRASE_OPTIONS.capitalize,
    includeNumber: preferences.includeNumber ?? DEFAULT_PASSPHRASE_OPTIONS.includeNumber,
    wordSeparator: resolveWordSeparator(preferences),
  };
}

export function buildPassphraseFormat(options: PassphraseOptions): string {
  const wordPlaceholder = options.capitalize ? "{word:capitalize}" : "{word:lowercase}";
  const numberPlaceholder = options.includeNumber ? "{number:random}" : "";

  return buildWordSeries(options.wordCount, wordPlaceholder, options.wordSeparator, numberPlaceholder);
}

export function passphraseFormatUsesWords(format: string): boolean {
  return /{word(?::(?:uppercase|lowercase|capitalize))?}/.test(format);
}

export function validatePassphraseFormat(format: string): string[] {
  const trimmedFormat = format.trim();

  if (trimmedFormat.length === 0) {
    return ["Custom passphrase format is empty."];
  }

  const errors: string[] = [];
  const placeholders = Array.from(trimmedFormat.matchAll(placeholderPattern));
  const formatWithoutPlaceholders = trimmedFormat.replace(placeholderPattern, "");

  if (/[{}]/.test(formatWithoutPlaceholders)) {
    errors.push("Format contains unmatched braces.");
  }

  if (placeholders.length === 0) {
    errors.push("Format must include at least one placeholder.");
  }

  for (const [, placeholder] of placeholders) {
    const parsedPlaceholder = /^([a-z]+)(?::([a-z0-9]+))?$/.exec(placeholder);

    if (!parsedPlaceholder) {
      errors.push(`Invalid placeholder "{${placeholder}}".`);
      continue;
    }

    const [, type, modifier] = parsedPlaceholder;
    const validationError = validatePlaceholder(type, modifier);

    if (validationError) {
      errors.push(`{${placeholder}} ${validationError}`);
    }
  }

  return Array.from(new Set(errors));
}

function buildCustomFormatPreset(preset: string, preferences: PassphrasePreferenceValues): string {
  const presetBuilder = Object.hasOwn(customFormatPresetBuilders, preset)
    ? customFormatPresetBuilders[preset]
    : undefined;

  if (presetBuilder) {
    return presetBuilder(resolvePassphraseOptions(preferences));
  }

  throw new Error(`Unsupported custom format preset "${preset}".`);
}

function expandWordsMacro(format: string, preferences: PassphrasePreferenceValues): string {
  const wordCount = resolveWordCount(preferences.wordCount);
  const wordSeparator = resolveWordSeparator(preferences);

  return format.replace(/{words(?::(uppercase|lowercase|capitalize))?}/g, (_, modifier: string | undefined) => {
    const wordPlaceholder = modifier ? `{word:${modifier}}` : "{word}";

    return buildWordSeries(wordCount, wordPlaceholder, wordSeparator);
  });
}

function buildWordSeries(wordCount: number, wordPlaceholder: string, wordSeparator: string, wordSuffix = ""): string {
  return Array.from({ length: wordCount }, () => `${wordPlaceholder}${wordSuffix}`).join(wordSeparator);
}

function joinFormatParts(parts: Array<string | undefined>, separator: string): string {
  return parts.filter((part): part is string => Boolean(part)).join(separator);
}

function resolveWordCount(wordCountPreference: string | undefined): number {
  const wordCount = parseIntegerInRange(wordCountPreference, 1, 64, DEFAULT_PASSPHRASE_OPTIONS.wordCount);

  if (wordCount === undefined) {
    throw new Error("Words must be a whole number from 1 to 64.");
  }

  return wordCount;
}

function resolveWordSeparator(preferences: PassphrasePreferenceValues): string {
  const preset = preferences.wordSeparatorPreset?.trim() || SETTINGS_WORD_SEPARATOR_PRESET;
  const wordSeparator =
    preset === CUSTOM_WORD_SEPARATOR_PRESET
      ? (preferences.customWordSeparator ?? DEFAULT_PASSPHRASE_OPTIONS.wordSeparator)
      : Object.hasOwn(wordSeparatorPresets, preset)
        ? wordSeparatorPresets[preset]
        : DEFAULT_PASSPHRASE_OPTIONS.wordSeparator;

  if (/[{}]/.test(wordSeparator)) {
    throw new Error("Word separator can't include braces.");
  }

  return wordSeparator;
}

function validatePlaceholder(type: string, modifier: string | undefined): string | undefined {
  switch (type) {
    case "word":
      if (modifier === undefined || wordModifiers.has(modifier)) {
        return undefined;
      }

      return "must use uppercase, lowercase, or capitalize.";
    case "symbol":
    case "random":
      if (isLengthModifier(modifier)) {
        return undefined;
      }

      return "must use a number from 1 to 64.";
    case "number":
      if (modifier === "random" || isLengthModifier(modifier)) {
        return undefined;
      }

      return "must use random or a number from 1 to 64.";
    default:
      return "is not supported.";
  }
}

function isLengthModifier(modifier: string | undefined): boolean {
  if (modifier === undefined) {
    return true;
  }

  return parseIntegerInRange(modifier, 1, 64) !== undefined;
}

function parseIntegerInRange(
  value: string | undefined,
  minimum: number,
  maximum: number,
  fallback?: number,
): number | undefined {
  const text = value?.trim() || (fallback === undefined ? "" : String(fallback));

  if (!/^\d+$/.test(text)) {
    return undefined;
  }

  const number = Number.parseInt(text, 10);

  return number >= minimum && number <= maximum ? number : undefined;
}
