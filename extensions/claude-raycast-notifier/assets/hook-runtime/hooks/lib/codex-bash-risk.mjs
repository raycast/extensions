const RISK_RULES = [
  {
    pattern: /\brm\s+-rf\b/,
    reason: "recursive deletion",
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason: "hard git reset",
  },
  {
    pattern: /\bgit\s+clean\b.*(?:^|\s)-f\S*/,
    reason: "forced git clean",
  },
  {
    pattern: /\bdd\s+if=/,
    reason: "raw disk write",
  },
  {
    pattern: /\bmkfs(\.\w+)?\b/,
    reason: "filesystem formatting",
  },
  {
    pattern: /\bshutdown\b|\breboot\b/,
    reason: "machine restart or shutdown",
  },
];

export function getCodexBashRisk(command) {
  if (typeof command !== "string") {
    return null;
  }

  const normalized = command.trim();
  if (!normalized) {
    return null;
  }

  for (const rule of RISK_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.reason;
    }
  }

  return null;
}
