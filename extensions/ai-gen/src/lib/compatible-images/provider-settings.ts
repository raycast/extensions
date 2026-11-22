import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { endpoint } from "./images";

export function providerSettings(
  preferences: Pick<Preferences, "imageApiBaseUrl" | "imageApiKey" | "imageOutputDirectory">
) {
  return {
    baseUrl: preferences.imageApiBaseUrl?.trim() || "",
    apiKey: preferences.imageApiKey?.trim() || "",
    outputDirectory: preferences.imageOutputDirectory || join(homedir(), "Pictures", "OpenAI Generator"),
  };
}

export function requireProvider(provider: ReturnType<typeof providerSettings>) {
  if (!provider.baseUrl || !provider.apiKey) {
    throw new Error(
      "Set Image Provider Base URL and Image Provider API Key in extension preferences, then reopen Generate or Edit Image."
    );
  }
  endpoint(provider.baseUrl, false);
  return provider;
}

export function modelKey(provider: ReturnType<typeof providerSettings>) {
  requireProvider(provider);
  return (
    "compatible-image-model-" +
    createHash("sha256")
      .update(endpoint(provider.baseUrl, false) + "\n" + provider.apiKey)
      .digest("hex")
  );
}
