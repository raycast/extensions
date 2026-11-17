export const ATTRIBUTION_HEADER = 'X-Modelflare-Skill'

// Same shape the gateway accepts in common/skill_attribution.go. A value that
// does not match is dropped there without an error, so reject it here instead.
const ATTRIBUTION_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}\/[0-9]{1,4}(\.[0-9]{1,4}){0,2}$/u
const ATTRIBUTION_MAX_LENGTH = 80

/**
 * Builds the `X-Modelflare-Skill` value for a plugin release, for example
 * `attributionValue('modelflare-vscode', '0.1.0')`.
 */
export function attributionValue(plugin: string, version: string): string {
  const value = `${plugin}/${version}`
  if (value.length > ATTRIBUTION_MAX_LENGTH || !ATTRIBUTION_PATTERN.test(value)) {
    throw new TypeError(
      `"${value}" is not a valid ${ATTRIBUTION_HEADER} value: use a lowercase slug and a numeric version such as 0.1.0`,
    )
  }
  return value
}
