interface Preferences {
  logPath: string;
  deployHQAPIKey: string;
  deployHQAccountName: string;
  deployHQUsername: string;
  defaultAction: string;
}

export function validateCredentials(preferences: Preferences): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate API Key
  if (!preferences.deployHQAPIKey || preferences.deployHQAPIKey.trim() === "") {
    errors.push("DeployHQ API Key is required");
  } else if (preferences.deployHQAPIKey.length < 10) {
    errors.push("DeployHQ API Key appears to be too short");
  }

  // Validate Account Name
  if (!preferences.deployHQAccountName || preferences.deployHQAccountName.trim() === "") {
    errors.push("DeployHQ Account Name is required");
  } else if (!/^[a-zA-Z0-9-_]+$/.test(preferences.deployHQAccountName)) {
    errors.push("DeployHQ Account Name should only contain letters, numbers, hyphens, and underscores");
  }

  // Validate Username (Email)
  if (!preferences.deployHQUsername || preferences.deployHQUsername.trim() === "") {
    errors.push("DeployHQ Username is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(preferences.deployHQUsername)) {
    errors.push("DeployHQ Username should be a valid email address");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
