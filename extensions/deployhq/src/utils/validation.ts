// Pre-compiled regex patterns for better performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_NAME_REGEX = /^[a-zA-Z0-9-_]+$/;

export function validateCredentials(preferences: Preferences): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Early return for missing API Key
  if (!preferences.deployHQAPIKey?.trim()) {
    errors.push("DeployHQ API Key is required");
  } else if (preferences.deployHQAPIKey.length < 10) {
    errors.push("DeployHQ API Key appears to be too short");
  }

  // Early return for missing Account Name
  if (!preferences.deployHQAccountName?.trim()) {
    errors.push("DeployHQ Account Name is required");
  } else if (!ACCOUNT_NAME_REGEX.test(preferences.deployHQAccountName)) {
    errors.push("DeployHQ Account Name should only contain letters, numbers, hyphens, and underscores");
  }

  // Early return for missing Username
  if (!preferences.deployHQUsername?.trim()) {
    errors.push("DeployHQ Username is required");
  } else if (!EMAIL_REGEX.test(preferences.deployHQUsername)) {
    errors.push("DeployHQ Username should be a valid email address");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
