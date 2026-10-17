import { MobbinError } from "./errors";
import type { Platform, SearchKind } from "./types";

export const REFERENCE_GRID_COLUMNS = 2;

export function searchGridAspectRatio(
  kind: SearchKind,
  platform: Platform,
): "9/16" | "16/9" {
  return kind === "section" || platform === "web" ? "16/9" : "9/16";
}

export function canExcludeFromSearch(kind: SearchKind, query: string): boolean {
  return kind === "screen" && query.trim().length > 0;
}

export function oauthActionStatus(
  status: "checking" | "disconnected" | "connected" | "expired",
  error: Error | undefined,
): "checking" | "disconnected" | "connected" | "expired" {
  return error instanceof MobbinError &&
    ["oauth-required", "mcp-error", "network-error", "server-error"].includes(
      error.code,
    )
    ? "expired"
    : status;
}

export function flowGridAspectRatio(flow: {
  platform: Platform;
  coverImage?: { width?: number; height?: number };
  screens: Array<{ image: { width?: number; height?: number } }>;
}): "9/16" | "16/9" {
  const image = flow.coverImage ?? flow.screens[0]?.image;
  if (image?.width && image.height)
    return image.height > image.width ? "9/16" : "16/9";
  return flow.platform === "ios" ? "9/16" : "16/9";
}
