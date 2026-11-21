import type { CalendarRole, RoutingKeywordMap } from "./calendar-settings";

const GENERIC_RULES: Array<{ role: CalendarRole; patterns: RegExp[] }> = [
  {
    role: "work",
    patterns: [
      /\bwork\b/,
      /\bshift\b/,
      /\bclient\b/,
      /\bcustomer\b/,
      /\bhelp\s*desk\b/,
      /\bticket\b/,
      /\bsite visit\b/,
      /\bteam meeting\b/,
      /\bstand[ -]?up\b/,
      /\boffice\b/,
    ],
  },
  {
    role: "shared",
    patterns: [
      /\bdate night\b/,
      /\bmovie night\b/,
      /\bdinner date\b/,
      /\banniversary\b/,
      /\bflat viewing\b/,
      /\bhouse viewing\b/,
      /\bapartment viewing\b/,
      /\btenancy\b/,
      /\bmove[ -]?in\b/,
      /\bmoving day\b/,
    ],
  },
  {
    role: "family",
    patterns: [
      /\bfamily\b/,
      /\bmum\b/,
      /\bmom\b/,
      /\bdad\b/,
      /\bparents?\b/,
      /\bsister\b/,
      /\bbrother\b/,
      /\bnan\b/,
      /\bnanna\b/,
      /\bgrandma\b/,
      /\bgrandad\b/,
      /\bgranddad\b/,
      /\bgrandparents?\b/,
    ],
  },
  {
    role: "personal",
    patterns: [
      /\bdentist\b/,
      /\bdental\b/,
      /\bdoctor\b/,
      /\bgp\b/,
      /\boptician\b/,
      /\boptometrist\b/,
      /\bhaircut\b/,
      /\bbarber\b/,
      /\bcar mot\b/,
      /\bmot\b/,
      /\bcar service\b/,
      /\bservice appointment\b/,
      /\bstudy session\b/,
    ],
  },
];

function normalise(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function keywordMatches(title: string, keyword: string): boolean {
  const clean = normalise(keyword);
  if (!clean) return false;
  return title.includes(clean);
}

export function detectCalendarRole(
  title: string,
  customKeywords: RoutingKeywordMap = {},
): CalendarRole | null {
  const value = normalise(title);
  if (!value) return null;

  // User-defined keywords take priority over the generic classifier.
  for (const role of [
    "work",
    "shared",
    "family",
    "personal",
  ] as CalendarRole[]) {
    if (
      (customKeywords[role] || []).some((keyword) =>
        keywordMatches(value, keyword),
      )
    )
      return role;
  }

  for (const rule of GENERIC_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(value))) return rule.role;
  }

  return null;
}
