export type ApiCompatible = "raycast" | "openai" | "claude";

export interface CompatibilityProfile {
  id: ApiCompatible;
  title: string;
  chatPath: string;
  modelsPath: string;
  defaultApiBase: string;
}

export const compatibilityProfiles: CompatibilityProfile[] = [
  {
    id: "raycast",
    title: "Raycast AI",
    chatPath: "",
    modelsPath: "",
    defaultApiBase: "",
  },
  {
    id: "openai",
    title: "OpenAI",
    chatPath: "/chat/completions",
    modelsPath: "/models",
    defaultApiBase: "https://api.openai.com/v1",
  },
  {
    id: "claude",
    title: "Claude",
    chatPath: "/messages",
    modelsPath: "/models",
    defaultApiBase: "https://api.anthropic.com/v1",
  },
];

export function isApiCompatible(value: unknown): value is ApiCompatible {
  return value === "raycast" || value === "openai" || value === "claude";
}

export function getCompatibilityProfile(id: ApiCompatible): CompatibilityProfile {
  return compatibilityProfiles.find((profile) => profile.id === id) ?? compatibilityProfiles[0];
}

export function normalizeApiBase(apiBase: string): string {
  return apiBase.trim().replace(/\/+$/, "");
}

export function buildCompatibleUrl(apiBase: string, path: string): string {
  const normalizedBase = normalizeApiBase(apiBase);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
