import type { LibraryPreferences } from "./types";
import { DEFAULT_API_HOST, DEFAULT_RESULT_LIMIT } from "./types";

export interface ExtensionPreferences {
  apiHost?: string;
  localLibraryFile?: string;
  libraryFolder?: string;
  useDemoFallback?: boolean;
  fetchRemoteAbstracts?: boolean;
  citationStyle?: "apa" | "harvard";
  resultLimit?: string;
}

export function mapPreferences(raw: ExtensionPreferences): LibraryPreferences {
  const parsedLimit = Number.parseInt(raw.resultLimit ?? "", 10);

  return {
    apiHost: (raw.apiHost || DEFAULT_API_HOST).replace(/\/$/, ""),
    localLibraryFile: raw.localLibraryFile || undefined,
    libraryFolder: raw.libraryFolder || undefined,
    useDemoFallback: raw.useDemoFallback !== false,
    fetchRemoteAbstracts: raw.fetchRemoteAbstracts !== false,
    citationStyle: raw.citationStyle === "harvard" ? "harvard" : "apa",
    resultLimit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_RESULT_LIMIT,
  };
}
