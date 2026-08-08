const SECRET_PATTERNS = [
  /\bsk-[a-z0-9_-]{20,}\b/i,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgithub_pat_[a-z0-9_]{20,}\b/i,
  /\bgh[opusr]_[a-z0-9]{20,}\b/i,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[a-z0-9_./+=-]{12,}/i,
];

export function containsLikelySecret(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}
