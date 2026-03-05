const collator = new Intl.Collator(undefined, { sensitivity: "accent" });

export function strCmp(s1: string, s2: string) {
  return collator.compare(s1, s2);
}

export function strEq(s1: string, s2: string) {
  return strCmp(s1, s2) === 0;
}

export const SEARCH_TEMPLATE = "{}";

/** Replace `{}` placeholder in a URL template with the encoded query */
export function fillTemplateUrl(template: string, query: string): string {
  return template.replace(SEARCH_TEMPLATE, encodeURIComponent(query));
}

/** Returns a fully-qualified URL if the input looks like a URL; otherwise null. */
export function toFullUrlIfLikely(input: string): string | null {
  const text = input.trim();
  if (text.length === 0) return null;

  const direct = safeParseUrl(text);
  if (direct) return direct.toString();

  let candidate: string | null = null;

  if (/^www\./i.test(text)) {
    candidate = `https://${text}`;
  } else if (/^localhost(:\d+)?(\/|$)/i.test(text)) {
    candidate = `http://${text}`;
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}(:\d+)?(\/|$)/.test(text)) {
    candidate = `http://${text}`;
  } else if (/^[^\s]+\.[^\s]{2,}(?:[:/].*)?$/i.test(text)) {
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

/** Strip DuckDuckGo bang from a query (e.g., "!g search term" -> "search term") */
export function stripDdgBang(query: string): string {
  return query.replace(/^!\w+\s*/, "").trim();
}
