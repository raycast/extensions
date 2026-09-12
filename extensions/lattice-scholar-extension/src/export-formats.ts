import { environment } from "@raycast/api";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-csl";
import "@citation-js/plugin-ris";

export type ExportFormat = string;

export interface FormatOption {
  id: ExportFormat;
  title: string;
  description: string;
}

export interface Paper {
  id: string;
  citekey: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi: string;
  volume: string;
  issue: string;
  pages: string;
  isbn: string;
  paperType: string;
  cslItem: Record<string, unknown>;
}

type StructuredFormat = "bibtex" | "ris" | "csl-json";
type RichOutput = "html" | "text";
type CslItem = Record<string, unknown> & {
  id: string;
  type?: string;
  title?: string;
};

const STRUCTURED_FORMATS: FormatOption[] = [
  { id: "bibtex", title: "BibTeX", description: "LaTeX/BibTeX format" },
  { id: "ris", title: "RIS", description: "Research Information Systems format" },
  { id: "csl-json", title: "CSL-JSON", description: "Citation Style Language JSON" },
];

const templateCache = new Map<string, string>();
const registeredTemplates = new Set<string>();
let styleIndexCache: Map<string, string> | undefined;

export const EXPORT_FORMATS: FormatOption[] = [
  ...STRUCTURED_FORMATS,
  ...getAvailableTemplates().map((styleName) => ({
    id: styleName,
    title: humanizeStyleName(styleName),
    description: `CSL bibliography style (${styleName}.csl)`,
  })),
];

const exportFormatTitles: Record<string, string> = Object.fromEntries(
  EXPORT_FORMATS.map((format) => [format.id, format.title]),
);

export function getAvailableTemplates(): string[] {
  return [...getStyleIndex().keys()].sort();
}

export function getFormatTitle(format: ExportFormat): string {
  return exportFormatTitles[format] || humanizeStyleName(format);
}

export function formatPaper(paper: Paper, format: ExportFormat): string {
  const cslItem = getCslItem(paper);

  switch (format) {
    case "bibtex":
      return new Cite([cslItem]).format("bibtex") as string;
    case "ris":
      return new Cite([cslItem]).format("ris") as string;
    case "csl-json":
      return JSON.stringify(cslItem, null, 2);
    default:
      return renderBibliography(cslItem, resolveTemplateName(format), "text");
  }
}

export function formatPaperWithTemplate(paper: Paper, template: string): string {
  return renderBibliography(getCslItem(paper), resolveTemplateName(template), "html");
}

export function formatPaperAsClipboardContent(
  paper: Paper,
  format: ExportFormat,
): { html: string; text: string } | string {
  if (isStructuredFormat(format)) {
    return formatPaper(paper, format);
  }

  const cslItem = getCslItem(paper);
  const templateName = resolveTemplateName(format);

  return {
    html: renderBibliography(cslItem, templateName, "html"),
    text: renderBibliography(cslItem, templateName, "text"),
  };
}

function getCslItem(paper: Paper): CslItem {
  if (!isRecord(paper.cslItem) || Object.keys(paper.cslItem).length === 0) {
    throw new Error(`Paper ${paper.id} does not include a CSL item`);
  }

  return {
    ...paper.cslItem,
    id: readString(paper.cslItem.id) || paper.citekey || paper.id,
  } as CslItem;
}

function renderBibliography(cslItem: CslItem, templateName: string, output: RichOutput): string {
  const xml = readTemplate(templateName);
  registerTemplate(templateName, xml);

  return new Cite([cslItem]).format("bibliography", {
    template: templateName,
    lang: "en-US",
    format: output,
  }) as string;
}

function resolveTemplateName(template: string): string {
  const normalized = template.trim().toLowerCase();
  const path = getStyleIndex().get(normalized);

  if (!path) {
    throw new Error(`Unsupported template: ${template}`);
  }

  return normalized;
}

function readTemplate(templateName: string): string {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName) ?? "";
  }

  const path = getStyleIndex().get(templateName);
  if (!path) {
    throw new Error(`Missing CSL style file: ${templateName}.csl`);
  }

  const template = readFileSync(path, "utf8");
  templateCache.set(templateName, template);
  return template;
}

function getStyleIndex(): Map<string, string> {
  if (styleIndexCache) {
    return styleIndexCache;
  }

  const stylesDir = join(environment.assetsPath, "styles");
  if (!existsSync(stylesDir)) {
    styleIndexCache = new Map();
    return styleIndexCache;
  }

  styleIndexCache = new Map(
    readdirSync(stylesDir)
      .filter((file) => file.endsWith(".csl"))
      .map((file) => [file.replace(/\.csl$/i, "").toLowerCase(), join(stylesDir, file)]),
  );

  return styleIndexCache;
}

function registerTemplate(templateName: string, xml: string): void {
  if (registeredTemplates.has(templateName)) {
    return;
  }

  const citeWithPlugins = Cite as typeof Cite & {
    plugins?: {
      config?: {
        get?: (name: string) => {
          templates?: {
            add?: (styleName: string, styleXml: string) => void;
          };
        };
      };
    };
  };

  citeWithPlugins.plugins?.config?.get?.("@csl")?.templates?.add?.(templateName, xml);
  registeredTemplates.add(templateName);
}

function isStructuredFormat(format: string): format is StructuredFormat {
  return STRUCTURED_FORMATS.some((option) => option.id === format);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function humanizeStyleName(styleName: string): string {
  return styleName
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
