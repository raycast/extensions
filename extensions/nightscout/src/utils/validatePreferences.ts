/**
 * Validates user preferences for viewing glucose data.
 * @param preferences - user preferences to validate
 * @returns an object indicating whether the preferences are valid and any error messages
 */
function validatePreferences(preferences: Preferences): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // URL validation

  try {
    new URL(preferences.instance);
  } catch {
    errors.push("Instance URL is not valid");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export { validatePreferences };
