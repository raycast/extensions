/**
 * Validate Keep Alive value.
 *
 * keep_alive values need to be in Time.Duration go format.
 *
 * @param CheckboxAdvanced - advanced settings checkbox status.
 * @param values - keep_alive value.
 * @returns string error if `values` is invalid
 */
export function ValidationKeepAlive(CheckboxAdvanced: boolean, values?: string): string | undefined {
  if (!CheckboxAdvanced) return;
  if (!values) return "The item is required";
  if (!values.match(/^-{0,1}(?:[0-9]+(?:\.{0,1}[0-9]+){0,1}(?:h|m|s|ms|us|ns){1})$/g)) return "Wrong Format";
}
