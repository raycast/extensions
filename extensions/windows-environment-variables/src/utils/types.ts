export type EnvScope = "User" | "Machine";

export interface EnvVar {
  name: string;
  value: string;
  scope: EnvScope;
}

export interface PathEntry {
  path: string;
  exists: boolean;
  scope: EnvScope;
  index: number;
}

/** Variables that cannot be deleted via the extension */
export const PROTECTED_VARIABLES = [
  "PATH",
  "PATHEXT",
  "COMSPEC",
  "SYSTEMROOT",
  "WINDIR",
  "OS",
  "PROCESSOR_ARCHITECTURE",
  "NUMBER_OF_PROCESSORS",
  "SYSTEMDRIVE",
];

/** Patterns that indicate a variable may contain sensitive data */
export const SENSITIVE_PATTERNS = [
  "KEY",
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PASSWD",
  "CREDENTIAL",
  "API_KEY",
  "APIKEY",
  "PRIVATE",
];
