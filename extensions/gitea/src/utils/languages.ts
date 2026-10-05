import languageData from "../../assets/languages.json";

export type LanguageType = "data" | "programming" | "markup" | "prose";

export interface LinguistLanguage {
  type: LanguageType;
  color?: string;
  extensions?: string[];
  aliases?: string[];
  ace_mode: string;
  language_id: number;
  tm_scope: string;
  codemirror_mode?: string;
  codemirror_mime_type?: string;
  fs_name?: string;
  group?: string;
  interpreters?: string[];
  wrap?: boolean;
  filenames?: string[];
}

const DEFAULT_COLOR = "#ccc";

class LanguageColors {
  private languageMap: Map<string, string>;
  private extensionMap: Map<string, string>;

  constructor() {
    this.languageMap = new Map<string, string>();
    this.extensionMap = new Map<string, string>();
    this.initialize();
  }

  private initialize(): void {
    for (const [languageName, entry] of Object.entries(languageData as Record<string, LinguistLanguage>)) {
      const color = entry.color ?? DEFAULT_COLOR;

      // Map language name
      this.languageMap.set(languageName.toLowerCase(), color);

      // Map aliases
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          this.languageMap.set(alias.toLowerCase(), color);
        }
      }

      // Map extensions
      if (entry.extensions) {
        for (const ext of entry.extensions) {
          const key = ext.startsWith(".") ? ext : `.${ext}`;
          this.extensionMap.set(key.toLowerCase(), color);
        }
      }
    }
  }

  /**
   * Get color for a language by name or alias
   * @param language - The language name or alias
   * @param useDefault - Whether to return a default color if not found
   * @returns The color hex string or undefined
   */
  getLanguageColor(language: string | null | undefined, useDefault = false): string | undefined {
    if (!language) return useDefault ? DEFAULT_COLOR : undefined;

    const color = this.languageMap.get(language.toLowerCase());
    return color ?? (useDefault ? DEFAULT_COLOR : undefined);
  }

  /**
   * Get color for a file extension
   * @param extension - The file extension (with or without leading dot)
   * @param useDefault - Whether to return a default color if not found
   * @returns The color hex string or undefined
   */
  getExtensionColor(extension: string | null | undefined, useDefault = false): string | undefined {
    if (!extension) return useDefault ? DEFAULT_COLOR : undefined;

    const normalized = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    const color = this.extensionMap.get(normalized);
    return color ?? (useDefault ? DEFAULT_COLOR : undefined);
  }

  /**
   * @deprecated Use getLanguageColor() instead
   */
  get(lang: string, handleOthers?: boolean): string | undefined {
    return this.getLanguageColor(lang, handleOthers);
  }

  /**
   * @deprecated Use getExtensionColor() instead
   */
  ext(ext: string, handleOthers?: boolean): string | undefined {
    return this.getExtensionColor(ext, handleOthers);
  }
}

const languageColors = new LanguageColors();
export { languageColors };
export const getLanguageColor = languageColors.getLanguageColor.bind(languageColors);
