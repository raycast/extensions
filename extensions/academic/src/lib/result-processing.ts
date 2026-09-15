import { COUNTRIES, marketplaceId } from "../config/catalog";
import type { AcademicSettings } from "./settings";
import type {
  AccessLink,
  FileFormat,
  SearchRequest,
  WorkResult,
} from "../types";

export type ProcessedResults = { results: WorkResult[]; notice?: string };

export function processResults(
  results: WorkResult[],
  request: SearchRequest,
  settings: AcademicSettings,
  final: boolean,
): ProcessedResults {
  const enabledMarketplaces =
    settings.marketplaces ??
    COUNTRIES.filter((country) =>
      settings.countries.includes(country.id),
    ).flatMap((country) =>
      country.marketplaces.map((marketplace) =>
        marketplaceId(country.id, marketplace.name),
      ),
    );
  const withMarkets = results.map((work) =>
    addMarketplaceLinks(work, settings.countries, enabledMarketplaces),
  );
  const withAcceptedFormats = withMarkets.map((work) => ({
    ...work,
    accessLinks: filterLinks(work.accessLinks, settings.formats),
  }));
  const formatFiltered =
    settings.showWorksWithoutAcceptedFiles &&
    !request.advanced?.withAcceptedFilesOnly
      ? withAcceptedFormats
      : withAcceptedFormats.filter((work) =>
          work.accessLinks.some(
            (link) => link.kind === "download" || link.kind === "read",
          ),
        );
  const qualityFiltered =
    settings.hideLowConfidenceResults && !request.advanced
      ? formatFiltered.filter(
          (work, index) => work.confidence !== "related" || index < 3,
        )
      : formatFiltered;
  const selectedLanguages = request.advanced?.languages?.length
    ? request.advanced.languages
    : settings.languages;
  if (!selectedLanguages.length) return { results: qualityFiltered };
  const preferred = qualityFiltered.filter((work) =>
    hasSelectedLanguage(work, selectedLanguages),
  );
  const unknown = qualityFiltered.filter((work) => !work.languages?.length);
  if (preferred.length)
    return {
      results: settings.includeUnknownLanguage
        ? uniqueWorks([...preferred, ...unknown])
        : preferred,
    };
  if (!final)
    return { results: settings.includeUnknownLanguage ? unknown : [] };
  const detected = [
    ...new Set(qualityFiltered.flatMap((work) => work.languages ?? [])),
  ];
  return {
    results: qualityFiltered,
    notice: `No results were found in the selected languages. Showing results in ${detected.length ? detected.join(", ") : "unknown languages"}.`,
  };
}

function addMarketplaceLinks(
  work: WorkResult,
  countryIds: string[],
  marketplaceIds: string[],
): WorkResult {
  if (work.kind !== "book") return work;
  const identifier =
    work.identifiers.isbn?.find(
      (isbn) => isbn.replace(/\D/g, "").length === 13,
    ) ?? work.identifiers.isbn?.[0];
  const query =
    identifier || [work.title, work.authors[0]].filter(Boolean).join(" ");
  const purchaseLinks: AccessLink[] = COUNTRIES.filter((country) =>
    countryIds.includes(country.id),
  ).flatMap((country) =>
    country.marketplaces
      .filter((marketplace) =>
        marketplaceIds.includes(marketplaceId(country.id, marketplace.name)),
      )
      .map((marketplace) => ({
        label: `${marketplace.name} — ${country.title}`,
        url: marketplace.searchUrl(query),
        source: marketplace.name,
        kind: "purchase" as const,
      })),
  );
  return {
    ...work,
    accessLinks: uniqueLinks([...work.accessLinks, ...purchaseLinks]),
  };
}

function filterLinks(
  links: AccessLink[],
  accepted: FileFormat[],
): AccessLink[] {
  return links.filter(
    (link) =>
      !["download", "read"].includes(link.kind) ||
      accepted.includes(detectFormat(link)),
  );
}

export function detectFormat(link: AccessLink): FileFormat {
  const value =
    `${link.format ?? ""} ${link.label} ${safePath(link.url)}`.toLowerCase();
  if (/\.pdf\b|\bpdf\b/.test(value)) return "pdf";
  if (/\.tex\b|latex|source package|source files/.test(value)) return "tex";
  if (/\.docx?\b|\bdocx?\b|ms word/.test(value)) return "doc";
  if (/\.txt\b|plain text|\btxt\b/.test(value)) return "txt";
  if (/\.epub\b|\bepub\b/.test(value)) return "epub";
  if (/\.html?\b|\bhtml\b|online reader|open preview|read online/.test(value))
    return "html";
  if (/\.djvu\b|\bdjvu\b/.test(value)) return "djvu";
  if (/\.rtf\b|\brtf\b/.test(value)) return "rtf";
  if (/\.xml\b|\bjats\b|\bxml\b/.test(value)) return "xml";
  if (/\.mobi\b|\.azw3?\b|\bmobi\b/.test(value)) return "mobi";
  return "unknown";
}

function hasSelectedLanguage(work: WorkResult, selected: string[]): boolean {
  return (work.languages ?? []).some((language) =>
    selected.includes(normalizeLanguage(language)),
  );
}
export function normalizeLanguage(value: string): string {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    eng: "en",
    por: "pt",
    pob: "pt",
    spa: "es",
    fre: "fr",
    fra: "fr",
    ger: "de",
    deu: "de",
    ita: "it",
    dut: "nl",
    nld: "nl",
    rus: "ru",
    ukr: "uk",
    gre: "el",
    ell: "el",
    lat: "la",
    ara: "ar",
    heb: "he",
    per: "fa",
    fas: "fa",
    hin: "hi",
    chi: "zh",
    zho: "zh",
    jpn: "ja",
    kor: "ko",
    ind: "id",
    tur: "tr",
    afr: "af",
    swa: "sw",
    mao: "mi",
    mri: "mi",
  };
  return map[normalized] ?? normalized.split(/[-_]/)[0];
}
function uniqueWorks(works: WorkResult[]): WorkResult[] {
  return [...new Map(works.map((work) => [work.id, work])).values()];
}
function uniqueLinks(links: AccessLink[]): AccessLink[] {
  return [
    ...new Map(
      links.map((link) => [`${link.kind}:${link.url}`, link]),
    ).values(),
  ];
}
function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
