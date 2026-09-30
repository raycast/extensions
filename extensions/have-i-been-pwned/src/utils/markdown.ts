import { Breach } from "./types";
import { formatDate, formatNumber } from "./format";
import { htmlToMarkdown } from "./html-to-markdown";

export function breachMarkdown(breach: Breach): string {
  const flags = [
    breach.IsVerified ? "Verified" : "Unverified",
    breach.IsFabricated ? "Fabricated" : null,
    breach.IsSensitive ? "Sensitive" : null,
    breach.IsSpamList ? "Spam List" : null,
    breach.IsMalware ? "Malware" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `# ${breach.Title}

${htmlToMarkdown(breach.Description)}

---

| Field | Value |
|---|---|
| Domain | ${breach.Domain || "N/A"} |
| Breach Date | ${formatDate(breach.BreachDate)} |
| Added | ${formatDate(breach.AddedDate)} |
| Accounts Affected | ${formatNumber(breach.PwnCount)} |
| Flags | ${flags} |

**Compromised Data:** ${breach.DataClasses.join(", ")}
`;
}

export function passwordMarkdown(count: number): string {
  if (count === 0) {
    return `# Good News!

This password was **not found** in any known data breaches.

> This check was performed using the [k-anonymity model](https://haveibeenpwned.com/API/v3#PwnedPasswords) — your password was never sent to any server.
`;
  }

  return `# Oh No — Pwned!

This password has been seen **${formatNumber(count)} times** in data breaches.

You should never use this password anywhere. Consider using a password manager to generate a unique, strong password.

> This check was performed using the [k-anonymity model](https://haveibeenpwned.com/API/v3#PwnedPasswords) — your password was never sent to any server.
`;
}
