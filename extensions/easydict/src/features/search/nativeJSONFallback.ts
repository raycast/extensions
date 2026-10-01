/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { showToast, Toast } from "@raycast/api";

import { fallbackAIProviderToPromptJSON } from "@/providers/profiles/repository";
import type { OpenAICompatibleProfile } from "@/providers/profiles/types";

export async function handleNativeJSONFallback(
  profile: Pick<OpenAICompatibleProfile, "id" | "name">,
  revalidate: () => Promise<unknown>,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const saved = await fallbackAIProviderToPromptJSON(profile.id);
    if (saved) await revalidate();
    if (signal?.aborted) return;
    await showToast({
      style: Toast.Style.Success,
      title: "Native JSON is unsupported",
      message: saved
        ? `${profile.name} was switched to Prompt-Based JSON.`
        : `${profile.name} used Prompt-Based JSON for this request. Update the saved provider manually.`,
    });
  } catch {
    if (signal?.aborted) return;
    await showToast({
      style: Toast.Style.Failure,
      title: "Native JSON is unsupported",
      message: `${profile.name} used Prompt-Based JSON for this request, but its saved setting could not be updated.`,
    });
  }
}
