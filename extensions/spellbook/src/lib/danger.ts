export interface DangerMatch {
  label: string;
}

const DANGER_PATTERNS: { label: string; pattern: RegExp }[] = [
  {
    label: "recursive or forced rm",
    pattern:
      /\brm\b(?:[^|;&\r\n]|\\\r?\n)*\s(?:--(?:recursive|force)\b|-[a-z]*[rf])/i,
  },
  { label: "sudo", pattern: /\bsudo\b/ },
  { label: "disk write via dd", pattern: /\bdd\b(?:[^|;&\r\n]|\\\r?\n)*\bof=/ },
  { label: "filesystem format", pattern: /\bmkfs\b/ },
  {
    label: "forced git push",
    pattern:
      /\bgit\s+push\b(?:[^|;&\r\n]|\\\r?\n)*(\s--force(-with-lease)?\b|\s-f\b)/,
  },
  {
    label: "SQL DROP/TRUNCATE",
    pattern: /\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b/i,
  },
  {
    label: "piping a download into a shell",
    // a bare newline ends the curl command but is legal shell after the pipe
    pattern: /\b(curl|wget)\b(?:[^|;&\r\n]|\\\r?\n)*\|[^|;&]*\b(ba|z|fi)?sh\b/,
  },
  {
    label: "chmod 777",
    pattern: /\bchmod\b(?:[^|;&\r\n]|\\\r?\n)*\b777\b/,
  },
  { label: "writing to a raw device", pattern: />\s*\/dev\/(r?disk|sd)/ },
];

export function detectDanger(command: string): DangerMatch | undefined {
  const hit = DANGER_PATTERNS.find((entry) => entry.pattern.test(command));
  return hit ? { label: hit.label } : undefined;
}
