const collator = new Intl.Collator(undefined, { sensitivity: "accent" });

export function strCmp(s1: string, s2: string) {
  return collator.compare(s1, s2);
}

export function strEq(s1: string, s2: string) {
  return strCmp(s1, s2) === 0;
}

// Returns a fully-qualified URL if the input looks like a URL; otherwise null.
export function toFullUrlIfLikely(input: string): string | null {
  const text = input.trim();
  if (text.length === 0) return null;

  // If it's already a valid URL, return it as-is
  const direct = safeParseUrl(text);
  if (direct) return direct.toString();

  // Heuristics for URL-like inputs without scheme
  let candidate: string | null = null;

  if (/^www\./i.test(text)) {
    candidate = `https://${text}`;
  } else if (/^localhost(:\d+)?(\/|$)/i.test(text)) {
    candidate = `http://${text}`;
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}(:\d+)?(\/|$)/.test(text)) {
    // IPv4 with optional port
    candidate = `http://${text}`;
  } else if (/^[^\s]+\.[^\s]{2,}(?:[:/].*)?$/i.test(text)) {
    // Domain with a dot and optional port/path
    candidate = `https://${text}`;
  }

  if (candidate) {
    const parsed = safeParseUrl(candidate);
    if (parsed) return parsed.toString();
  }

  return null;
}

function safeParseUrl(s: string): URL | null {
  try {
    return new URL(s);
  } catch {
    return null;
  }
}
