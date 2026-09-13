import raycastConfig from "@raycast/eslint-config";

/**
 * Every warning becomes an error.
 *
 * `ray lint` has no --max-warnings flag, and running ESLint directly is not equivalent: it lints
 * raycast-env.d.ts, which Raycast generates and excludes internally. Rewriting severities here keeps
 * one lint invocation and one config, so local and CI agree.
 */
function asError(severity) {
  if (severity === "warn" || severity === 1) return "error";
  if (Array.isArray(severity)) {
    const [level, ...options] = severity;
    return level === "warn" || level === 1 ? ["error", ...options] : severity;
  }
  return severity;
}

const strict = raycastConfig.map((entry) =>
  entry.rules
    ? {
        ...entry,
        rules: Object.fromEntries(Object.entries(entry.rules).map(([rule, severity]) => [rule, asError(severity)])),
      }
    : entry,
);

/** @type {import("eslint").Linter.Config[]} */
export default [...strict, { ignores: ["dist/", "scripts/"] }];
