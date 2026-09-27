import type { Post, TextGeneration, Variant } from "./types";

export const VARIANT_COUNT = 3;

export type WrittenVariant = {
  text: string;
  violation?: string;
};

const PLATFORM_NAMES: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  pinterest: "Pinterest",
};

const STATUS_NAMES: Record<string, string> = {
  draft: "Draft",
  queued: "Queued",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

export function platformName(provider: string): string {
  return PLATFORM_NAMES[provider] ?? provider;
}

export function statusName(status: string): string {
  return STATUS_NAMES[status] ?? status;
}

export function metricName(key: string): string {
  const words = key.split("_").filter(Boolean);
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export function variantText(variant: Variant): string {
  return (variant.parts ?? []).join("\n\n");
}

export function postText(post: Post): string {
  const parts = (post.parts ?? []).map((part) => part?.content ?? "").filter(Boolean);
  if (parts.length > 0) return parts.join("\n\n");
  return post.caption ?? "";
}

export function firstLine(text: string, fallback: string): string {
  const line = text
    .split("\n")
    .map((candidate) => candidate.trim())
    .find(Boolean);
  return line ?? fallback;
}

export function isFinished(generation: Pick<TextGeneration, "status">): boolean {
  return generation.status === "succeeded" || generation.status === "failed";
}

export function isVariant(variant: Variant | null | undefined): variant is Variant {
  return variant !== null && variant !== undefined;
}

export function variantSlots(generation: Pick<TextGeneration, "status" | "variants"> | undefined): Variant[] {
  const variants = generation?.variants ?? [];
  if (generation && isFinished(generation)) return variants.filter(isVariant);
  const count = Math.max(VARIANT_COUNT, variants.length);
  return Array.from({ length: count }, (_, index) => variants[index] ?? { status: "pending" });
}

export function writtenVariants(generation: Pick<TextGeneration, "variants">): WrittenVariant[] {
  return generation.variants
    .filter(isVariant)
    .filter((variant) => variant.status === "succeeded")
    .flatMap((variant) => {
      const text = variantText(variant);
      if (!text) return [];
      return [variant.violation ? { text, violation: variant.violation } : { text }];
    });
}
