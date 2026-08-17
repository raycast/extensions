import { useState } from "react";
import type { Form } from "@raycast/api";

/**
 * Hook that manages the error state of a required Raycast form field.
 * Clears the error while the user types and re-validates on blur or submit.
 *
 * @param emptyErrorMessage - Error shown when the field is empty
 * @returns Field error state, a `validate` helper for submit-time checks, and
 *   `handleChange`/`handleBlur` handlers to pass to the form field
 */
export function useRequiredFormField(emptyErrorMessage: string) {
  const [error, setError] = useState<string | undefined>();

  function validate(value: string | undefined): boolean {
    if (!value?.trim()) {
      setError(emptyErrorMessage);
      return false;
    }
    return true;
  }

  function handleChange() {
    if (error) {
      setError(undefined);
    }
  }

  function handleBlur(event: Form.Event<string>) {
    validate(event.target.value);
  }

  return { error, validate, handleChange, handleBlur };
}
