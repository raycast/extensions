// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import {
  PopToRootType,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
} from "@raycast/api";

import { MarkerApiError } from "./marker-api";

export async function runWithToast(options: {
  loadingTitle: string;
  successTitle: string;
  failureTitle: string;
  successMessage?: string | (() => string | undefined);
  popToRootOnSuccess?: boolean;
  closeMainWindowOnSuccess?: boolean;
  task: () => Promise<void>;
}): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: options.loadingTitle,
  });

  try {
    await options.task();
    toast.style = Toast.Style.Success;
    toast.title = options.successTitle;
    toast.message =
      typeof options.successMessage === "function"
        ? options.successMessage()
        : options.successMessage;
    if (options.closeMainWindowOnSuccess) {
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }
    if (options.popToRootOnSuccess) {
      await popToRoot({ clearSearchBar: true });
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = options.failureTitle;
    toast.message = errorMessage(error);
  }
}

export function requiredString(
  value: string | undefined,
  message: string,
): string {
  const trimmed = optionalTrimmed(value);
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
}

export function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function dateWithOffset(offset: string | undefined, now = new Date()) {
  const seconds = offsetSeconds(offset);
  return new Date(now.getTime() + seconds * 1000);
}

export function offsetSeconds(value: string | undefined): number {
  const trimmed = optionalTrimmed(value);
  if (!trimmed) {
    return 0;
  }

  const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*(ms|s|sec|m|min|h)?$/i);
  if (!match) {
    throw new Error("Offset must look like -10s, 30s, 2m, or 1h.");
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    throw new Error("Offset must be a valid number.");
  }

  const unit = match[2]?.toLocaleLowerCase() ?? "s";
  if (unit === "ms") {
    return amount / 1000;
  }
  if (unit === "m" || unit === "min") {
    return amount * 60;
  }
  if (unit === "h") {
    return amount * 3600;
  }
  return amount;
}

export function errorMessage(error: unknown): string {
  const diagnostic = markerApiDiagnosticMessage(error);
  if (diagnostic) {
    return diagnostic;
  }
  return error instanceof Error ? error.message : "Marker action failed.";
}

export function markerApiDiagnosticMessage(error: unknown): string | undefined {
  if (!(error instanceof MarkerApiError)) {
    return undefined;
  }
  if (error.code === "missing_token") {
    return "Add a Marker API token in Raycast extension preferences.";
  }
  if (error.code === "invalid_base_url") {
    return "Marker could not derive a valid API base URL from the saved token.";
  }
  if (error.code === "timeout") {
    return "Marker API timed out. Check your connection and try again.";
  }
  if (error.code === "network") {
    return "Raycast could not reach Marker API. Check the token environment and network connection.";
  }
  if (error.status === 401) {
    return "Marker rejected the API token. Create or paste a current token in extension preferences.";
  }
  if (error.status === 403) {
    return "The Marker token is missing required scopes: sessions:read, subsessions:read, tags:read, markers:read/write, and chapterMarkers:read/write.";
  }
  return undefined;
}
