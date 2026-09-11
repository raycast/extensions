import { Action } from "@raycast/api";

type ConfirmationResult = {
  style?: Action.Style;
  message?: string;
  info?: Array<{ name: string; value?: string }>;
};

/** Confirm when more than one item will be mutated. */
export function batchConfirmation(
  count: number,
  message: string,
  info?: Array<{ name: string; value: string }>,
): ConfirmationResult | undefined {
  if (count <= 1) return undefined;
  return {
    message,
    info,
  };
}

/** Always confirm destructive actions (delete, reset, etc.). */
export function destructiveConfirmation(
  message: string,
  info?: Array<{ name: string; value: string }>,
): ConfirmationResult {
  return {
    style: Action.Style.Destructive,
    message,
    info,
  };
}
