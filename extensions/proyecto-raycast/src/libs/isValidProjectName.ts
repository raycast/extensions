export function isValidProjectName(name: string): { valid: boolean; error?: string } {
  const minLength = 1;
  const maxLength = 50;

  if (name.length < minLength || name.length > maxLength) {
    return { valid: false, error: `Name must be between ${minLength} and ${maxLength} characters long.` };
  }

  const validNamePattern = /^[a-z\d](?:[a-z\d]|[_-][a-z\d])*$/i;
  if (!validNamePattern.test(name)) {
    return {
      valid: false,
      error:
        "Name can only contain alphanumeric characters, hyphens, or underscores, and cannot start or end with a hyphen or underscore.",
    };
  }

  return { valid: true };
}
