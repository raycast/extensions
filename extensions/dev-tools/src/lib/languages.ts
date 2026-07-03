// The language roster shared by every formatter/minifier command. Each Raycast
// command renders the shared view with one of these languages fixed. `canMinify`
// records whether a meaningful minifier exists (SCSS/LESS/Markdown/YAML format
// but have no standalone minification, so they get a Format command only).

export type Language =
  | "javascript"
  | "typescript"
  | "css"
  | "scss"
  | "less"
  | "html"
  | "xml"
  | "sql"
  | "markdown"
  | "yaml";

export type Operation = "format" | "minify";

export interface LanguageMeta {
  id: Language;
  label: string;
  /** Bare file extension, used in placeholder/UI copy. */
  ext: string;
  canMinify: boolean;
}

export const LANGUAGES: Record<Language, LanguageMeta> = {
  javascript: { id: "javascript", label: "JavaScript", ext: "js", canMinify: true },
  typescript: { id: "typescript", label: "TypeScript", ext: "ts", canMinify: true },
  css: { id: "css", label: "CSS", ext: "css", canMinify: true },
  scss: { id: "scss", label: "SCSS", ext: "scss", canMinify: false },
  less: { id: "less", label: "Less", ext: "less", canMinify: false },
  html: { id: "html", label: "HTML", ext: "html", canMinify: true },
  xml: { id: "xml", label: "XML", ext: "xml", canMinify: true },
  sql: { id: "sql", label: "SQL", ext: "sql", canMinify: true },
  markdown: { id: "markdown", label: "Markdown", ext: "md", canMinify: false },
  yaml: { id: "yaml", label: "YAML", ext: "yaml", canMinify: false },
};

export const MINIFIABLE: Language[] = (Object.values(LANGUAGES) as LanguageMeta[])
  .filter((meta) => meta.canMinify)
  .map((meta) => meta.id);
