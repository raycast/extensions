import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  projectId: string;
  clientId: string;
  clientSecret: string;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function validateConfig(config: Preferences): void {
  if (!config.projectId) {
    throw new ConfigurationError(
      "Project ID is required. Get it from the Device Access Console: https://console.nest.google.com/device-access"
    );
  }

  if (!config.clientId) {
    throw new ConfigurationError("OAuth Client ID is required");
  }
  if (!config.clientId.endsWith(".apps.googleusercontent.com")) {
    throw new ConfigurationError("Invalid OAuth Client ID format");
  }

  if (!config.clientSecret) {
    throw new ConfigurationError("OAuth Client Secret is required");
  }
  if (!config.clientSecret.startsWith("GOCSPX-")) {
    throw new ConfigurationError("Invalid OAuth Client Secret format");
  }
}

export function getConfig(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  const clientId = preferences.clientId as string;
  const clientSecret = preferences.clientSecret as string;
  const projectId = preferences.projectId as string;

  if (!clientId || !clientSecret || !projectId) {
    throw new ConfigurationError(
      "Please set your Google Nest credentials in the extension preferences"
    );
  }

  console.log('Config loaded:', {
    clientId: clientId.substring(0, 8) + '...',
    projectId
  });

  validateConfig({ projectId, clientId, clientSecret });
  return {
    projectId,
    clientId,
    clientSecret,
  };
} 