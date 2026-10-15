// POSIX locale strings look like `language[_territory][.codeset][@modifier]`,
// e.g. `en_US.UTF-8` or `C`. macOS can also set LC_*/LANG to an extended
// identifier such as `en-CZ-u-ca-gregory-cu-czk-...` (a valid ICU locale ID
// but not a valid POSIX one), which makes shells spawned for command-type
// actions print `setlocale` warnings before the command runs.
const POSIX_LOCALE_PATTERN =
  /^[A-Za-z]+(_[A-Za-z]+)*(\.[A-Za-z0-9-]+)?(@[A-Za-z0-9]+)?$/;

// Only these are locale categories; other LC_* variables (e.g. LC_TERMINAL)
// are not passed to setlocale and must be left alone.
const LOCALE_KEYS = new Set([
  "LANG",
  "LC_ALL",
  "LC_COLLATE",
  "LC_CTYPE",
  "LC_MESSAGES",
  "LC_MONETARY",
  "LC_NUMERIC",
  "LC_TIME",
  "LC_ADDRESS",
  "LC_IDENTIFICATION",
  "LC_MEASUREMENT",
  "LC_NAME",
  "LC_PAPER",
  "LC_TELEPHONE",
]);

function isValidPosixLocale(value: string): boolean {
  // macOS Terminal conventionally exports LC_CTYPE=UTF-8, which shells accept.
  return value === "UTF-8" || POSIX_LOCALE_PATTERN.test(value);
}

export function sanitizeShellEnvironment(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = { ...env };
  for (const key of Object.keys(result)) {
    if (LOCALE_KEYS.has(key)) {
      const value = result[key];
      if (value !== undefined && !isValidPosixLocale(value)) {
        delete result[key];
      }
    }
  }
  return result;
}
