export type TargetPlatform = "ios" | "ios-device" | "android";

export function normalizeTarget(platform: TargetPlatform, target?: string): string | undefined {
  const normalizedTarget = target?.trim();
  if (!normalizedTarget) return undefined;

  if (normalizedTarget.toLowerCase() === "booted") {
    return platform === "ios" ? "booted" : undefined;
  }

  return normalizedTarget;
}

export function fallbackTarget(platform: TargetPlatform, target?: string): string | undefined {
  return normalizeTarget(platform, target) ?? (platform === "ios" ? "booted" : undefined);
}
