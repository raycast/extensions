import { Clipboard, LaunchProps, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";

type Preferences = {
  defaultVersion: string;
  versionAliases?: string;
  openMethod: "ref.ly URL" | "logosres scheme";
  copyUrlToClipboard?: boolean;
};

type CommandArguments = {
  input?: string;
};

type AliasMap = Record<string, string>;

const SYNONYM_RULES: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /^jn\.?\b/i, replacement: "John" },
  { regex: /^jhn\b/i, replacement: "John" },
  { regex: /^1\s*j(?:n|ohn)\b/i, replacement: "1 John" },
  { regex: /^2\s*j(?:n|ohn)\b/i, replacement: "2 John" },
  { regex: /^3\s*j(?:n|ohn)\b/i, replacement: "3 John" },
];

const KNOWN_BOOK_PREFIXES = [
  "genesis",
  "gen",
  "exodus",
  "exo",
  "ex",
  "leviticus",
  "lev",
  "numbers",
  "num",
  "deuteronomy",
  "deut",
  "joshua",
  "judges",
  "ruth",
  "1 samuel",
  "2 samuel",
  "1 kings",
  "2 kings",
  "1 chronicles",
  "2 chronicles",
  "ezra",
  "nehemiah",
  "esther",
  "job",
  "psalm",
  "psalms",
  "ps",
  "proverbs",
  "prov",
  "ecclesiastes",
  "song of solomon",
  "song of songs",
  "song",
  "isaiah",
  "jeremiah",
  "lamentations",
  "ezekiel",
  "daniel",
  "hosea",
  "joel",
  "amos",
  "obadiah",
  "jonah",
  "micah",
  "nahum",
  "habakkuk",
  "zephaniah",
  "haggai",
  "zechariah",
  "malachi",
  "matthew",
  "mark",
  "luke",
  "john",
  "acts",
  "romans",
  "1 corinthians",
  "2 corinthians",
  "galatians",
  "ephesians",
  "philippians",
  "colossians",
  "1 thessalonians",
  "2 thessalonians",
  "1 timothy",
  "2 timothy",
  "titus",
  "philemon",
  "hebrews",
  "james",
  "1 peter",
  "2 peter",
  "1 john",
  "2 john",
  "3 john",
  "jude",
  "revelation",
  "rev",
  "jn",
  "jhn",
];

export default async function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const input = props.arguments.input?.trim() ?? "";

  if (!input) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Input required",
      message: "Type an alias and a reference, for example: nasb John 3:16",
    });
    return;
  }

  const defaultVersion = preferences.defaultVersion?.trim();
  if (!defaultVersion) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Default version missing",
      message: "Set a Default Version in the command preferences.",
    });
    return;
  }

  if (preferences.openMethod === "logosres scheme") {
    await showToast({
      style: Toast.Style.Failure,
      title: "logosres not supported",
      message: "Switch Open Method to ref.ly URL until a logosres mapping table is available.",
    });
    return;
  }

  const versionAliases = parseVersionAliases(preferences.versionAliases);
  const resolution = resolveVersionAndReference(input, versionAliases, defaultVersion);

  if ("error" in resolution) {
    await showToast({ style: Toast.Style.Failure, title: resolution.error.title, message: resolution.error.message });
    return;
  }

  const reference = normalizeReference(resolution.reference);
  if (!reference) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Reference required",
      message: "Provide a verse reference like John 3:16",
    });
    return;
  }

  const url = `https://ref.ly/${encodeURIComponent(reference)};${resolution.version}`;

  try {
    if (preferences.copyUrlToClipboard) {
      await Clipboard.copy(url);
    }
    await open(url);
    await showHUD("Opening in Logos");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Logos",
      message: `Try this URL in a browser: ${url}`,
    });
  }
}

function parseVersionAliases(raw?: string): AliasMap {
  const map: AliasMap = {};
  if (!raw) {
    return map;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return map;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === "string") {
          const alias = key.trim().toLowerCase();
          const version = value.trim();
          if (alias && version) {
            map[alias] = version;
          }
        }
      }
      return map;
    }
  } catch {
    // Ignore JSON parse failure and fall back to line parsing.
  }

  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const segments = line.split(",");
    for (const segment of segments) {
      const normalized = segment.trim();
      if (!normalized || normalized.startsWith("#")) {
        continue;
      }
      const [aliasRaw, versionRaw] = normalized.split(/\s*=\s*/);
      const alias = aliasRaw?.trim().toLowerCase();
      const version = versionRaw?.trim();
      if (alias && version) {
        map[alias] = version;
      }
    }
  }

  return map;
}

function resolveVersionAndReference(
  input: string,
  aliasMap: AliasMap,
  defaultVersion: string,
): { version: string; reference: string } | { error: { title: string; message: string } } {
  const tokens = input.split(/\s+/);
  const firstToken = tokens[0];
  const aliasValue = aliasMap[firstToken.toLowerCase()];

  if (aliasValue) {
    const referenceTokens = tokens.slice(1).filter(Boolean);
    if (referenceTokens.length === 0) {
      return { error: { title: "Reference required", message: "Provide a verse reference after the alias." } };
    }
    return { version: aliasValue, reference: referenceTokens.join(" ") };
  }

  if (isUnknownAliasAttempt(tokens, aliasMap)) {
    return {
      error: {
        title: `Unknown alias: ${firstToken}`,
        message: "Configure Version Aliases in settings or remove the alias prefix.",
      },
    };
  }

  return { version: defaultVersion, reference: input };
}

function isUnknownAliasAttempt(tokens: string[], aliasMap: AliasMap): boolean {
  if (Object.keys(aliasMap).length === 0 || tokens.length < 2) {
    return false;
  }

  const [first, second, third, fourth] = tokens;
  if (!first) {
    return false;
  }

  if (/^\d/.test(first)) {
    return false;
  }

  const originalInput = tokens.join(" ");
  if (startsWithKnownBook(originalInput)) {
    return false;
  }

  const secondHasDigits = second ? /[\d:]/.test(second) : false;
  const secondIsConnector = second ? ["of", "the"].includes(second.toLowerCase()) : false;

  if (secondHasDigits && !third) {
    return false;
  }

  if (second && /^[a-zA-Z]{1,5}$/.test(second) && third && /[\d:]/.test(third)) {
    return true;
  }

  if (second && /^\d+$/.test(second) && third && /[a-zA-Z]+/.test(third) && fourth && /[\d:]/.test(fourth)) {
    return true;
  }

  if (!secondHasDigits && !secondIsConnector && third && /[\d:]/.test(third)) {
    return true;
  }

  return false;
}

function startsWithKnownBook(input: string): boolean {
  const lower = normalizeSpacing(input).toLowerCase();
  return KNOWN_BOOK_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function normalizeReference(raw: string): string {
  let reference = normalizeSpacing(raw).replace(/[–—−]/g, "-").replace(/[“”]/g, '"').replace(/[’‘]/g, "'");

  for (const { regex, replacement } of SYNONYM_RULES) {
    const match = reference.match(regex);
    if (match) {
      const rest = reference.slice(match[0].length).trimStart();
      reference = rest ? `${replacement} ${rest}` : replacement;
      break;
    }
  }

  return reference.trim();
}

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
