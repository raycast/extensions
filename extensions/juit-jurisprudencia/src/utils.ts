import { Jurisprudence } from "./types";

export function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleDateString("pt-BR", { month: "short" });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Data inválida";
  }
}

export function formatCourtName(courtCode: string): string {
  const courtNames: Record<string, string> = {
    STF: "Supremo Tribunal Federal",
    STJ: "Superior Tribunal de Justiça",
    STM: "Superior Tribunal Militar",
    TSE: "Tribunal Superior Eleitoral",
    TST: "Tribunal Superior do Trabalho",
  };

  return courtNames[courtCode] || courtCode;
}

export function truncateText(text: string | null, maxLength: number = 200): string {
  if (!text) return "N/A";

  if (text.length <= maxLength) return text;

  return text.slice(0, maxLength) + "...";
}

export function buildSearchQuery(
  searchTerm: string,
  useExactMatch: boolean = false,
  operator: "E" | "OU" | "MASNAO" = "E"
): string {
  if (useExactMatch) {
    return `"${searchTerm}"`;
  }

  const terms = searchTerm.trim().split(/\s+/);
  if (terms.length === 1) {
    return terms[0];
  }

  return terms.join(` ${operator} `);
}

export function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function createDateFilter(
  date: Date,
  operator: "$gt" | "$gte" | "$lt" | "$lte" | "" = ""
): string {
  const formattedDate = formatDateForApi(date);
  return operator ? `${operator}${formattedDate}` : formattedDate;
}

export function extractKeywords(jurisprudence: Jurisprudence): string[] {
  const keywords: string[] = [];

  if (jurisprudence.document_matter_list) {
    keywords.push(...jurisprudence.document_matter_list);
  }

  if (jurisprudence.process_class_name_list) {
    keywords.push(...jurisprudence.process_class_name_list);
  }

  return keywords.filter(Boolean);
}

export function getJurisprudenceSubtitle(jurisprudence: Jurisprudence): string {
  const parts: string[] = [];

  if (jurisprudence.court_code) {
    parts.push(jurisprudence.court_code);
  }

  if (jurisprudence.degree) {
    parts.push(jurisprudence.degree);
  }

  if (jurisprudence.trier) {
    parts.push(`Rel. ${jurisprudence.trier}`);
  }

  if (jurisprudence.order_date) {
    parts.push(formatDate(jurisprudence.order_date));
  }

  return parts.join(" • ");
}

export function validateSearchQuery(query: string): boolean {
  return query.trim().length >= 2;
}

export function sanitizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}
