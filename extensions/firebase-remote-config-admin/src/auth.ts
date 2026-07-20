import {
  getAdcAccessToken,
  getServiceAccountAccessToken,
  hasAdcCredentials,
} from "./google-auth";
import { getPreferences } from "./storage";
import type { ProjectConfig } from "./types";

export type AuthMethod = "service-account" | "adc" | "oauth";

export async function getAccessTokenContext(
  project: ProjectConfig,
): Promise<{ accessToken: string; authMethod: AuthMethod }> {
  const preferences = getPreferences();
  if (
    project.credentialRef?.trim() ||
    preferences.sharedCredentialRef?.trim()
  ) {
    return {
      accessToken: await getServiceAccountAccessToken(project),
      authMethod: "service-account",
    };
  }

  if (await hasAdcCredentials()) {
    return {
      accessToken: await getAdcAccessToken(),
      authMethod: "adc",
    };
  }

  throw new Error(
    "No Firebase credentials found. Configure a service account JSON path or run `gcloud auth application-default login`.",
  );
}

export async function getAccessToken(project: ProjectConfig): Promise<string> {
  const context = await getAccessTokenContext(project);
  return context.accessToken;
}
