export const SESSION_LABEL_MAX_LENGTH = 128;

export interface SessionLabelValidation {
  label: string;
  error?: string;
}

/**
 * Validates a session name entered in the New Session form.
 * Returns the trimmed label Rex should receive, plus an error message when it is unusable.
 */
export function validateSessionLabel(value: string): SessionLabelValidation {
  const label = value.trim();

  if (!label) {
    return { label, error: "Enter a name for the session." };
  }

  if ([...label].length > SESSION_LABEL_MAX_LENGTH) {
    return {
      label,
      error: `Session names are limited to ${SESSION_LABEL_MAX_LENGTH} characters.`,
    };
  }

  return { label };
}
