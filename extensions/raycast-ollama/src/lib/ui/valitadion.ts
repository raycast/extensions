import { ThinkingEffort } from "../enum";

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

/**
 * Validate Thinking value.
 *
 * thinking values need to be in ThinkingEffort Enum.
 *
 * @param value - value to evaluate.
 * @returns string whit error message if `value` is invalid.
 */
export function ValidationThinking(value?: string): string | undefined {
  if (!value) return "This item is required";
  const thinkingAvailableValues: string[] = Object.values(ThinkingEffort);
  if (thinkingAvailableValues.includes(value)) return;
  return "Wrong value";
}
