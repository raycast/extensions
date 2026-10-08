// Linten Cloud API Client for Raycast
// Strictly processor-only: 100% cloud reusability, zero local AST or link parsing.
// All requests dispatch to https://linten.apps.loopstates.com/api/

export const LINTEN_CLOUD_BASE = "https://linten.apps.loopstates.com";

export interface AuditReport {
  ok: boolean;
  error?: string;
  report?: {
    scores: {
      overall: number;
      structure: number;
      links: number;
      bestPractices: number;
    };
    findings: Array<{
      severity: "error" | "warning" | "info";
      title: string;
      detail?: string;
      recommendation?: string;
    }>;
  };
  specialistMetrics?: {
    tokens?: {
      gemini?: number;
      claude?: number;
      gpt4o?: number;
      deepseek?: number;
    };
    words?: number;
    chars?: number;
    hasCompanion?: boolean;
  };
}

export interface LinkProbeResult {
  title: string;
  url: string;
  status: number;
  latencyMs: number;
  ok: boolean;
  redirectUrl?: string;
}

export interface LinkProbeReport {
  ok: boolean;
  error?: string;
  total: number;
  auditedCount: number;
  summary: {
    ok: number;
    redirect: number;
    broken: number;
    timeout: number;
    score: number;
  };
  results: LinkProbeResult[];
}

export interface SynthesizeReport {
  ok: boolean;
  error?: string;
  title?: string;
  linkCount?: number;
  fullContent?: string;
  metrics?: {
    estimatedTokens: number;
    wordCount: number;
    characterCount: number;
    fitsGpt4o: boolean;
    fitsClaudeSonnet: boolean;
    fitsGemini: boolean;
  };
  synthesizedAt?: string;
}

/**
 * Validates a remote llms.txt URL via Linten Cloud API
 */
export async function auditRemoteUrl(url: string): Promise<AuditReport> {
  const target = url.trim();
  const endpoint = `${LINTEN_CLOUD_BASE}/api/validate?url=${encodeURIComponent(target)}&source=raycast`;

  const res = await fetch(endpoint, {
    headers: {
      "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok && res.status !== 400 && res.status !== 404) {
    throw new Error(`Linten API error (HTTP ${res.status}): ${res.statusText}`);
  }

  return (await res.json()) as AuditReport;
}

/**
 * Validates raw llms.txt content via Linten Cloud API
 */
export async function auditRawContent(content: string): Promise<AuditReport> {
  const endpoint = `${LINTEN_CLOUD_BASE}/api/validate?source=raycast`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok && res.status !== 400) {
    throw new Error(`Linten API error (HTTP ${res.status}): ${res.statusText}`);
  }

  return (await res.json()) as AuditReport;
}

/**
 * Performs concurrent reachability probe on up to 100 links via Linten Cloud API
 */
export async function probeLinks(payload: {
  content?: string;
  urls?: string[];
  baseUrl?: string;
}): Promise<LinkProbeReport> {
  const endpoint = `${LINTEN_CLOUD_BASE}/api/check-links`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok && res.status !== 400) {
    throw new Error(`Link probe error (HTTP ${res.status}): ${res.statusText}`);
  }

  return (await res.json()) as LinkProbeReport;
}

export function isValidUrlInput(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes("\n") || trimmed.includes(" ")) return false;
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed)) return true;
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(:\d+)?([/?#]\S*)?$/.test(trimmed);
}

export function isLocalOrInternalUrl(urlStr: string): boolean {
  try {
    const fullUrl =
      urlStr.startsWith("http://") || urlStr.startsWith("https://")
        ? urlStr
        : `https://${urlStr}`;
    const parsed = new URL(fullUrl);
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host) ||
      host.startsWith("169.254.") ||
      host.startsWith("fe80:") ||
      host.startsWith("fc00:") ||
      host.startsWith("fd00:")
    );
  } catch {
    return false;
  }
}

/**
 * Synthesizes the companion llms-full.txt archive via Linten Cloud API
 */
export async function synthesizeCompanion(input: {
  url?: string;
  content?: string;
}): Promise<SynthesizeReport> {
  let content = input.content || "";
  const url = input.url;

  if (url && isLocalOrInternalUrl(url)) {
    throw new Error(
      "Local and private network URLs cannot be compiled via Linten Cloud. Please provide a public URL or paste markdown directly.",
    );
  }

  // If a URL was provided without raw markdown content, fetch the llms.txt content first
  if (url && !content.trim()) {
    try {
      const fetchResp = await fetch(url, {
        headers: {
          "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
          Accept: "text/plain,text/markdown,*/*",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (fetchResp.ok) {
        content = await fetchResp.text();
      } else {
        throw new Error(
          `Could not load llms.txt from ${url} (HTTP ${fetchResp.status})`,
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Could not load")) {
        throw err;
      }
      // If direct client fetch failed due to CORS or network, fallback to passing url to GET endpoint
    }
  }

  let res: Response;
  if (content.trim()) {
    const endpoint = `${LINTEN_CLOUD_BASE}/api/v1/synthesize?source=raycast`;
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ content, url }),
      signal: AbortSignal.timeout(15000),
    });
  } else if (url) {
    const endpoint = `${LINTEN_CLOUD_BASE}/api/v1/synthesize?url=${encodeURIComponent(url)}&source=raycast`;
    res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
  } else {
    throw new Error("Missing target URL or markdown content to synthesize.");
  }

  const json = (await res.json()) as SynthesizeReport;
  if (!res.ok && !json.error) {
    throw new Error(
      `Companion synthesis error (HTTP ${res.status}): ${res.statusText}`,
    );
  }
  return json;
}

export function getBadgeUrl(domain: string): string {
  const cleanDomain =
    domain
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim() || "acme.com";
  return `${LINTEN_CLOUD_BASE}/badge?domain=${encodeURIComponent(cleanDomain)}`;
}

export function getBadgeMarkdown(domain: string): string {
  const cleanDomain =
    domain
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim() || "acme.com";
  const badgeUrl = getBadgeUrl(cleanDomain);
  return `[![llms.txt](${badgeUrl})](${LINTEN_CLOUD_BASE})`;
}

export function getBadgeHtml(domain: string): string {
  const cleanDomain =
    domain
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim() || "acme.com";
  const badgeUrl = getBadgeUrl(cleanDomain);
  return `<a href="${LINTEN_CLOUD_BASE}"><img src="${badgeUrl}" alt="llms.txt" /></a>`;
}

/**
 * Canonical AST Auto-Formatter: normalizes headings, standardizes '-' bullets,
 * and formats link lines according to LLMs.txt Spec v2
 */
export function formatToSpecV2(raw: string): string {
  const lines = raw.split("\n");
  let title = "";
  let summary = "";
  let foundFirstH1 = false;
  let foundSummary = false;

  interface Section {
    title: string;
    items: string[];
  }
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed && !foundFirstH1) continue;

    // 1. Detect First H1 Title
    if (!foundFirstH1 && /^#\s+(.+)$/.test(trimmed)) {
      title = trimmed.replace(/^#\s+/, "").trim();
      foundFirstH1 = true;
      continue;
    }

    // 2. Extra H1s are automatically demoted to H2 sections
    if (foundFirstH1 && /^#\s+(.+)$/.test(trimmed)) {
      const secTitle = trimmed.replace(/^#\s+/, "").trim();
      currentSection = { title: secTitle, items: [] };
      sections.push(currentSection);
      continue;
    }

    // 3. Blockquote summary (handles single and multi-line blockquotes)
    if (foundFirstH1 && sections.length === 0 && /^>\s*(.*)$/.test(trimmed)) {
      const quoteText = trimmed.replace(/^>\s*/, "").trim();
      summary = summary ? `${summary}\n> ${quoteText}` : quoteText;
      foundSummary = true;
      continue;
    }

    // 4. H2 Section header
    if (/^##\s+(.+)$/.test(trimmed)) {
      const secTitle = trimmed.replace(/^##\s+/, "").trim();
      currentSection = { title: secTitle, items: [] };
      sections.push(currentSection);
      continue;
    }

    // 5. Standardize Markdown link items: - [Title](url): Description
    const listMatch = trimmed.match(/^[-*+]\s+\[([^\]]+)\]\((.+)$/);
    if (listMatch) {
      const anchor = listMatch[1].trim();
      const rest = listMatch[2];
      // Find closing ')' of the markdown link while balancing parentheses within URL
      let depth = 1;
      let closeIdx = -1;
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === "(") depth++;
        else if (rest[i] === ")") {
          depth--;
          if (depth === 0) {
            closeIdx = i;
            break;
          }
        }
      }
      if (closeIdx !== -1) {
        const url = rest.substring(0, closeIdx).trim();
        let desc = rest.substring(closeIdx + 1).trim();
        if (desc.startsWith(":")) {
          desc = desc.substring(1).trim();
        }
        const formattedLink = desc
          ? `- [${anchor}](${url}): ${desc}`
          : `- [${anchor}](${url})`;
        if (!currentSection) {
          currentSection = { title: "Documentation", items: [] };
          sections.push(currentSection);
        }
        currentSection.items.push(formattedLink);
        continue;
      }
    }

    // 6. Preserve other content
    if (trimmed) {
      if (!currentSection) {
        if (!summary && foundFirstH1) {
          summary = trimmed;
          foundSummary = true;
        } else {
          currentSection = { title: "Documentation", items: [] };
          sections.push(currentSection);
          currentSection.items.push(trimmed);
        }
      } else {
        currentSection.items.push(trimmed);
      }
    }
  }

  const output: string[] = [];
  output.push(`# ${title || "Documentation"}`);
  output.push("");
  if (summary) {
    output.push(`> ${summary}`);
    output.push("");
  }
  if (sections.length === 0) {
    output.push("## Documentation");
    output.push("");
  } else {
    for (const sec of sections) {
      output.push(`## ${sec.title}`);
      output.push("");
      for (const item of sec.items) {
        output.push(item);
      }
      output.push("");
    }
  }

  return output.join("\n").trim() + "\n";
}

export interface GenerateTemplateResult {
  ok: boolean;
  content: string;
  domain: string;
  generator?: string;
  error?: string;
}

/**
 * Scaffolds an initial Spec v2 llms.txt manifest via the central Linten Cloud Scaffolder.
 */
export async function generateTemplate(
  domain: string,
): Promise<GenerateTemplateResult> {
  const cleanDomain =
    domain
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "") || "acme.com";
  const url = `${LINTEN_CLOUD_BASE}/api/v1/generate?url=${encodeURIComponent(cleanDomain)}&source=raycast`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  const json: any = await res.json();
  if (!res.ok) {
    throw new Error(
      json.error || `Template generation failed (HTTP ${res.status})`,
    );
  }

  return {
    ok: true,
    content: json.content || "",
    domain: json.input || cleanDomain,
    generator: json.generator,
  };
}
