import {
  showToast,
  Toast,
  open,
  getPreferenceValues,
  showHUD,
  popToRoot,
  LaunchProps,
  Detail,
  ActionPanel,
  Action,
  AI,
  environment,
  Icon,
  Color,
  getSelectedText,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface ExternalSource {
  name: string;
  snippet?: string;
  url?: string;
  confidence: number;
}

interface TOCQuality {
  quality: "good" | "medium" | "poor";
  confidence: number;
  reason: string;
  hasEnoughInfo: boolean;
}

interface KlappentextResult {
  text: string;
  keywords: string[];
  sources: ExternalSource[];
  confidence: number;
  warning?: string;
}

const DNB_SRU_BASE_URL = "https://services.dnb.de/sru/dnb";
const DNB_BASE_URL = "https://d-nb.info";
const TOC_SUFFIX = "/04";
const TEXT_SUFFIX = "/34";

/**
 * Normalizes ISBN by removing all hyphens, spaces, and other separators
 */
function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, "");
}

/**
 * Validates ISBN-10 or ISBN-13 format
 */
function isValidISBN(isbn: string): boolean {
  const normalized = normalizeISBN(isbn);
  return /^\d{9}[\dX]$/i.test(normalized) || /^\d{13}$/.test(normalized);
}

/**
 * Searches DNB SRU API for book metadata including title and author
 */
async function searchDNBMetadata(isbn: string): Promise<{ idn: string; title: string; author: string } | null> {
  const normalized = normalizeISBN(isbn);
  const sruUrl = `${DNB_SRU_BASE_URL}?version=1.1&operation=searchRetrieve&query=isbn%3D${normalized}&recordSchema=MARC21-xml&maximumRecords=1`;

  try {
    const response = await fetch(sruUrl, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw new Error(`DNB API returned status ${response.status}`);
    }

    const text = await response.text();

    // Extract IDN from controlfield 001
    const idnMatch = text.match(/<controlfield tag="001">(\d+X?)<\/controlfield>/);
    if (!idnMatch) return null;
    const idn = idnMatch[1];

    // Extract title from datafield 245, subfield a
    const titleMatch = text.match(/<datafield tag="245"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);
    const title = titleMatch?.[1]?.trim().replace(/\s*\/\s*$/, "") || "";

    // Extract full 245 field for fallback author parsing
    const field245 = text.match(/<datafield tag="245"[^>]*>([\s\S]*?)<\/datafield>/);
    const field245text = field245?.[1] ?? "";

    // Extract author: Priority 100$a → 700$a → 110$a → from 245 → ""
    const field100 = text.match(/<datafield tag="100"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);
    const field700 = text.match(/<datafield tag="700"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);
    const field110 = text.match(/<datafield tag="110"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);

    // Fallback: extract author from 245 subfields (e.g. "/ von Ingrid Knoche" or "/ Max Mustermann")
    let field245author = "";
    if (!field100 && !field700 && !field110) {
      const subfieldValues = [...field245text.matchAll(/<subfield code="[^"]*">([^<]+)<\/subfield>/g)].map((m) => m[1]);
      const combined = subfieldValues.join(" ");
      // Priority 1: "von Firstname Lastname" (both parts capitalized)
      const vonMatch = combined.match(/\bvon\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)+)/);
      // Priority 2: "/ Firstname Lastname" (directly after slash, no "von")
      const slashMatch = combined.match(/\/\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)+)(?:\s|$|\.\.\.)/);
      field245author = vonMatch?.[1]?.trim() ?? slashMatch?.[1]?.trim() ?? "";
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[DNB] ISBN ${normalized} – creator fields:`);
      console.log(`  MARC 100 (main entry person):   ${field100?.[1] ?? "—"}`);
      console.log(`  MARC 700 (added entry person):  ${field700?.[1] ?? "—"}`);
      console.log(`  MARC 110 (corporate body):      ${field110?.[1] ?? "—"}`);
      console.log(`  MARC 245 (title field, full):   ${field245text.replace(/\s+/g, " ").trim()}`);
      console.log(`  Fallback from 245:              ${field245author || "—"}`);
    }

    const authorRaw = field100?.[1] ?? field700?.[1] ?? field110?.[1] ?? field245author;
    const author = authorRaw.trim().replace(/,\s*$/, "");

    if (process.env.NODE_ENV === "development") {
      console.log(`  → Extracted author:             ${author || "(empty)"}`);
    }

    return { idn, title, author };
  } catch (error) {
    console.error("Error searching DNB:", error);
    throw error;
  }
}

/**
 * Checks if content is available at the given URL
 */
async function checkContentAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    // 405 = HEAD not allowed → treat as available and let browser handle it
    return response.ok || response.status === 405;
  } catch {
    return false;
  }
}

/**
 * Fetches the DNB table-of-contents page and returns plain text for AI prompts.
 */
async function fetchTocPlainText(url: string): Promise<string> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return "";
    const html = await response.text();
    const withoutBlocks = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    const text = withoutBlocks
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 12000);
  } catch {
    return "";
  }
}

/**
 * Assesses the quality of a table of contents for generating a book description.
 * Returns poor/hasEnoughInfo=false immediately if input is empty (no AI call).
 */
async function assessTOCQuality(toc: string): Promise<TOCQuality> {
  if (!toc.trim()) {
    return { quality: "poor", confidence: 0, reason: "No TOC text available", hasEnoughInfo: false };
  }

  const prompt = `Bewerte die Qualität dieses Inhaltsverzeichnisses für die Klappentext-Generierung.

Inhaltsverzeichnis:
${toc}

Antworte NUR mit folgendem JSON-Format (keine Markdown-Codeblöcke):
{
  "quality": "good" | "medium" | "poor",
  "confidence": 0-100,
  "reason": "Kurze Begründung auf Deutsch",
  "hasEnoughInfo": true | false
}

Kriterien:
- "good": Aussagekräftige Kapitel-Titel mit thematischem Kontext (z.B. "Die Entdeckung im Meer", "Der Angriff der Wale")
- "medium": Einige informative Titel, aber auch generische (z.B. Mix aus "Kapitel 1" und "Die Krise")
- "poor": Nur Nummern/generische Titel ohne Kontext (z.B. "Kapitel 1", "Teil I", "Prolog", "Epilog")

Antworte NUR mit dem JSON-Objekt, nichts anderes!`;

  try {
    const response = await AI.ask(prompt, { creativity: 0.3 });
    const cleaned = response.replace(/```json\s*|\s*```/g, "").trim();
    const result = JSON.parse(cleaned);
    return result;
  } catch (error) {
    console.error("TOC quality assessment failed:", error);
    return { quality: "medium", confidence: 50, reason: "Automatic assessment failed", hasEnoughInfo: true };
  }
}

/**
 * Fetches book description from Google Books API
 */
async function fetchGoogleBooksInfo(isbn: string): Promise<ExternalSource | null> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.log("Google Books API error:", response.status);
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const items = data.items as Array<{ volumeInfo: { description?: string; infoLink?: string } }> | undefined;

    if (!items || items.length === 0) {
      return null;
    }

    const book = items[0].volumeInfo;
    const description = book.description;

    if (!description) {
      return null;
    }

    return {
      name: "Google Books (Publisher Description)",
      snippet: description.substring(0, 500),
      url: book.infoLink || `https://books.google.com/books?isbn=${isbn}`,
      confidence: 85,
    };
  } catch (error) {
    console.error("Google Books fetch failed:", error);
    return null;
  }
}

/**
 * Fetches book info from Wikipedia
 */
async function fetchWikipediaInfo(title: string, author: string): Promise<ExternalSource | null> {
  try {
    // Search for the book on German Wikipedia
    const searchQuery = encodeURIComponent(`${title} ${author}`);
    const searchUrl = `https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&origin=*`;

    const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!searchResponse.ok) return null;

    const searchData = (await searchResponse.json()) as Record<string, unknown>;
    const wikiQuery = searchData.query as { search?: Array<{ title: string }> } | undefined;

    if (!wikiQuery?.search || wikiQuery.search.length === 0) {
      return null;
    }

    const firstResult = wikiQuery.search[0];
    const pageTitle = firstResult.title;

    // Get page extract
    const extractUrl = `https://de.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;

    const extractResponse = await fetch(extractUrl, { signal: AbortSignal.timeout(5000) });
    if (!extractResponse.ok) return null;

    const extractData = (await extractResponse.json()) as Record<string, unknown>;
    const extractQuery = extractData.query as { pages?: Record<string, { extract?: string }> } | undefined;
    const pages = extractQuery?.pages;

    if (!pages) return null;

    const page = Object.values(pages)[0];
    const extract = page?.extract;

    if (!extract) return null;

    return {
      name: "Wikipedia",
      snippet: extract.substring(0, 500),
      url: `https://de.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      confidence: 75,
    };
  } catch (error) {
    console.error("Wikipedia fetch failed:", error);
    return null;
  }
}

/**
 * Generates a book description using external sources (Google Books, Wikipedia).
 * All external sources are always fetched when isbn is available.
 */
async function generateVerifiedKlappentext(
  isbn: string,
  title: string,
  author: string,
  toc: string,
): Promise<KlappentextResult> {
  const sources: ExternalSource[] = [];

  // 1. Assess TOC quality (no AI call if empty)
  const hasTOCText = toc.trim().length > 0;
  const tocQuality = await assessTOCQuality(toc);

  // 2. Always fetch all external sources when isbn is available
  if (isbn) {
    const googleBooks = await fetchGoogleBooksInfo(isbn);
    if (googleBooks) sources.push(googleBooks);

    const wikipedia = await fetchWikipediaInfo(title, author);
    if (wikipedia) sources.push(wikipedia);
  }

  // 3. Return insufficient data only if neither TOC nor any external source available
  if (!hasTOCText && sources.length === 0) {
    return {
      text: "Insufficient information available. No table of contents and no external sources could be found.",
      keywords: [],
      sources: [],
      confidence: 0,
      warning: "⚠️ Insufficient information base for a reliable book description",
    };
  }

  // 4. Generate book description with all available sources
  const poorTocWithSources = (!hasTOCText || tocQuality.quality === "poor") && sources.length > 0;

  const prompt = poorTocWithSources
    ? `Du bist ein sachlicher Buchbeschreibungs-Generator.

REGEL: Erfinde NICHTS. Nutze ausschließlich die bereitgestellten Quellen.

BUCH-INFORMATIONEN:
Titel: ${title}
Autor: ${author}
ISBN: ${isbn}

EXTERNE QUELLEN:
${sources.map((s) => `\n${s.name}:\n${s.snippet}\nURL: ${s.url}\n`).join("\n")}

AUFGABE:
1. Erstelle eine sachliche Kurzbeschreibung (max. 100 Wörter, deutsch)
   - Kein Roman-Klappentext, keine blumige Sprache
   - Beschreibe das Themengebiet: was lernt/findet der Leser?
   - Nutze nur Informationen aus den Quellen oben
   - Falls zu wenig Info: Antworte "INSUFFICIENT_DATA: [Grund]"

2. Erstelle 5 Suchwörter (Hauptwörter, kommagetrennt)

3. Konfidenz: 40-60% (da kein Buchinhalt direkt verfügbar)

ANTWORT-FORMAT (exakt so):
KLAPPENTEXT:
[Deine sachliche Beschreibung - oder "INSUFFICIENT_DATA: [Grund]"]

SUCHWÖRTER:
[Begriff1, Begriff2, Begriff3, Begriff4, Begriff5]

QUELLEN_GENUTZT:
[Liste der genutzten Quellen]

KONFIDENZ:
[Zahl 40-60]%`
    : `Du bist ein deutschsprachiger Klappentext-Generator mit strengem Fact-Checking.

KRITISCH WICHTIG - GOLDEN RULES:
1. Erfinde NICHTS! Nutze nur Informationen aus den bereitgestellten Quellen.
2. Falls unsicher: Antworte "INSUFFICIENT_DATA" statt zu spekulieren.
3. Markiere Unsicherheiten klar im Text.
4. Besser kein Klappentext als ein falscher!

BUCH-INFORMATIONEN:
Titel: ${title}
Autor: ${author}
ISBN: ${isbn}

${
  sources.length > 0
    ? `EXTERNE QUELLEN (PRIMÄR):
${sources.map((s) => `\n${s.name}:\n${s.snippet}\nURL: ${s.url}\n`).join("\n")}`
    : ""
}

INHALTSVERZEICHNIS (SEKUNDÄR - nur zur Strukturierung):
${toc}

QUALITÄT DES INHALTSVERZEICHNISSES:
${tocQuality.reason}
Aussagekraft: ${tocQuality.quality}

AUFGABE:
1. Erstelle einen Klappentext (max. 150 Wörter, deutsch)
   - Nutze PRIMÄR die externen Quellen für Inhalt/Handlung
   - Nutze Inhaltsverzeichnis nur zur Strukturierung
   - Falls Quellen widersprüchlich: Erwähne das
   - Falls zu wenig Info: Antworte "INSUFFICIENT_DATA: [Grund]"

2. Erstelle 5 Suchwörter (Hauptwörter, kommagetrennt)

3. Gib deine Konfidenz an (0-100%)

ANTWORT-FORMAT (exakt so):
KLAPPENTEXT:
[Dein Klappentext hier - oder "INSUFFICIENT_DATA: [Grund]"]

SUCHWÖRTER:
[Begriff1, Begriff2, Begriff3, Begriff4, Begriff5]

QUELLEN_GENUTZT:
[Liste der genutzten Quellen]

KONFIDENZ:
[Zahl 0-100]%`;

  try {
    const response = await AI.ask(prompt, { creativity: 0.7 });

    // Parse response
    const klappentextMatch = response.match(/KLAPPENTEXT:\s*(.+?)(?=\n\nSUCHWÖRTER:|$)/s);
    const keywordsMatch = response.match(/SUCHWÖRTER:\s*(.+?)(?=\n\nQUELLEN_GENUTZT:|$)/s);
    const confidenceMatch = response.match(/KONFIDENZ:\s*(\d+)%/);

    const klappentext = klappentextMatch?.[1]?.trim() || "";
    const keywordsStr = keywordsMatch?.[1]?.trim() || "";
    const rawConfidence = parseInt(confidenceMatch?.[1] || "50", 10);

    // Floor confidence based on available sources with content:
    // 2+ sources with snippets → at least 70%, 1 source → at least 60%
    const sourcesWithSnippets = sources.filter((s) => s.snippet && s.snippet.trim().length > 0).length;
    const confidence = poorTocWithSources
      ? rawConfidence
      : sourcesWithSnippets >= 2
        ? Math.max(rawConfidence, 70)
        : sourcesWithSnippets >= 1
          ? Math.max(rawConfidence, 60)
          : rawConfidence;

    // Check for insufficient data
    if (klappentext.includes("INSUFFICIENT_DATA")) {
      const reason = klappentext.replace("INSUFFICIENT_DATA:", "").trim();
      return {
        text: `Book description could not be generated: ${reason}`,
        keywords: [],
        sources,
        confidence: 0,
        warning: "⚠️ AI could not generate a reliable book description",
      };
    }

    // Parse keywords
    const keywords = keywordsStr
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, 5);

    // Generate warning if confidence is low
    let warning: string | undefined;
    if (poorTocWithSources) {
      warning = "ℹ️ Based on title and external sources – no book content available.";
    } else if (confidence < 60) {
      warning = "⚠️ Low confidence - please review manually!";
    } else if (tocQuality.quality === "poor") {
      warning = "ℹ️ Based mainly on external sources (table of contents has little informational value)";
    }

    return {
      text: klappentext,
      keywords,
      sources,
      confidence,
      warning,
    };
  } catch (error) {
    console.error("Klappentext generation failed:", error);
    throw error;
  }
}

/**
 * Detail View Component for showing AI-generated Klappentext
 */
function KlappentextView({
  result,
  tocUrl,
  isbn,
  title,
  author,
}: {
  result: KlappentextResult;
  tocUrl: string;
  isbn: string;
  title: string;
  author: string;
}) {
  const getConfidenceColor = (conf: number): Color => {
    if (conf >= 70) return Color.Green;
    if (conf >= 50) return Color.Yellow;
    return Color.Red;
  };

  const getConfidenceIcon = (conf: number): Icon => {
    if (conf >= 70) return Icon.CheckCircle;
    if (conf >= 50) return Icon.QuestionMarkCircle;
    return Icon.XMarkCircle;
  };

  return (
    <Detail
      markdown={`# 📚 ${title}

**Author:** ${author}
**ISBN:** ${isbn}

${result.warning ? `\n> ${result.warning}\n` : ""}

---

## Book Description

${result.text}

---

**Keywords:** ${result.keywords.join(", ") || "None"}

---

${
  result.sources.length > 0
    ? `## 🔍 Sources Used

${result.sources.map((s) => `- **${s.name}** (Confidence: ${s.confidence}%)${s.url ? `\n  [Open Link](${s.url})` : ""}`).join("\n")}

---
`
    : ""
}

*Generated with Raycast AI • Confidence: ${result.confidence}%*`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            {tocUrl ? <Action.OpenInBrowser title="Open Table of Contents" url={tocUrl} /> : null}
            <Action.CopyToClipboard title="Copy Book Description" content={result.text} />
            <Action.CopyToClipboard
              title="Copy Book Description with Metadata"
              content={`${result.text}\n\nKeywords: ${result.keywords.join(", ")}\n\nSources: ${result.sources.map((s) => s.name).join(", ")}\n\nISBN: ${isbn}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Sources">
            {result.sources.map((source, idx) =>
              source.url ? <Action.OpenInBrowser key={idx} title={`Open ${source.name}`} url={source.url} /> : null,
            )}
          </ActionPanel.Section>
          <Action title="Close" onAction={() => popToRoot()} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {title ? <Detail.Metadata.Label title="Title" text={title} /> : null}
          {author ? <Detail.Metadata.Label title="Author" text={author} /> : null}
          {isbn ? <Detail.Metadata.Label title="ISBN" text={isbn} /> : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Confidence"
            text={`${result.confidence}%`}
            icon={{ source: getConfidenceIcon(result.confidence), tintColor: getConfidenceColor(result.confidence) }}
          />
          <Detail.Metadata.Label title="Sources" text={result.sources.length.toString()} />
          <Detail.Metadata.Separator />
          {tocUrl ? <Detail.Metadata.Link title="DNB" text="Table of Contents" target={tocUrl} /> : null}
        </Detail.Metadata>
      }
    />
  );
}

/**
 * Main Command Component
 */
export default function Command(props: LaunchProps<{ arguments: Arguments.LookupBook }>) {
  const { isbn: argIsbn } = props.arguments;
  const preferences = getPreferenceValues<Preferences.LookupBook>();

  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [result, setResult] = useState<KlappentextResult | null>(null);
  const [bookInfo, setBookInfo] = useState<{
    title: string;
    author: string;
    tocUrl: string;
    isbn: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runCommand() {
      // Auto-fill ISBN: arg → selected text
      let effectiveIsbn = argIsbn?.trim() || "";
      if (!effectiveIsbn) {
        try {
          const selectedText = await getSelectedText();
          const compact = selectedText.replace(/[-\s]/g, "");
          const match = compact.match(/(?:\d{13}|\d{9}[\dX])/i);
          if (match && isValidISBN(match[0])) {
            effectiveIsbn = match[0];
          }
        } catch {
          // silent fail – no selected text available
        }
      }

      if (!effectiveIsbn) {
        await showToast({
          style: Toast.Style.Failure,
          title: "ISBN Required",
          message: "Please enter an ISBN-10 or ISBN-13",
        });
        if (!cancelled) setIsLoading(false);
        return;
      }

      if (!isValidISBN(effectiveIsbn)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid ISBN",
          message: "Please enter a valid ISBN-10 or ISBN-13",
        });
        if (!cancelled) setIsLoading(false);
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Searching DNB...",
        message: `ISBN: ${normalizeISBN(effectiveIsbn)}`,
      });

      try {
        // Step 1: Search for book metadata
        toast.message = "Fetching book information...";
        const metadata = await searchDNBMetadata(effectiveIsbn);
        if (cancelled) return;

        if (!metadata) {
          await toast.hide();
          await showToast({
            style: Toast.Style.Failure,
            title: "No Results",
            message: "No DNB entries found for this ISBN",
          });
          if (!cancelled) setIsLoading(false);
          return;
        }

        const { idn, title, author } = metadata;
        const baseUrl = `${DNB_BASE_URL}/${idn}`;
        const tocUrl = `${baseUrl}${TOC_SUFFIX}`;
        const textUrl = `${baseUrl}${TEXT_SUFFIX}`;

        // Step 2: Check availability
        toast.message = "Checking availability...";
        const tocAvailable = await checkContentAvailable(tocUrl);
        if (cancelled) return;

        if (!tocAvailable) {
          const textAvailable = await checkContentAvailable(textUrl);
          if (cancelled) return;
          if (textAvailable) {
            await open(textUrl);
            await toast.hide();
            await showHUD("Content Text opened");
          } else {
            await toast.hide();
            await showToast({
              style: Toast.Style.Failure,
              title: "No Digitized Content Available",
              message: "No digitized content available for this book",
            });
            await open(baseUrl);
          }
          if (!cancelled) setIsLoading(false);
          return;
        }

        // Step 3: Generate book description if preference is enabled
        if (preferences.generateKlappentext) {
          if (!environment.canAccess(AI)) {
            await toast.hide();
            await showToast({
              style: Toast.Style.Success,
              title: "Table of Contents Opened",
              message: "Book description generation requires Raycast Pro or BYOK",
            });
            await open(tocUrl);
            await popToRoot();
            if (!cancelled) setIsLoading(false);
            return;
          }

          toast.message = "Loading table of contents…";
          const tocText = await fetchTocPlainText(tocUrl);
          if (cancelled) return;

          toast.message = "Checking sources and generating book description...";

          try {
            const klappentextResult = await generateVerifiedKlappentext(
              normalizeISBN(effectiveIsbn),
              title,
              author,
              tocText,
            );
            if (cancelled) return;

            setBookInfo({
              title,
              author,
              tocUrl,
              isbn: normalizeISBN(effectiveIsbn),
            });
            setResult(klappentextResult);
            setShowDetail(true);
            await toast.hide();
            if (!cancelled) setIsLoading(false);
          } catch (error) {
            console.error("Klappentext generation failed:", error);
            await toast.hide();
            await showToast({
              style: Toast.Style.Failure,
              title: "Book Description Generation Failed",
              message: "Opening table of contents instead",
            });
            await open(tocUrl);
            await popToRoot();
            if (!cancelled) setIsLoading(false);
          }
        } else {
          // Generation disabled – open all available content
          const urlsToOpen: string[] = [];

          if (tocAvailable) urlsToOpen.push(tocUrl);

          const textAvailable = await checkContentAvailable(textUrl);
          if (cancelled) return;
          if (textAvailable) urlsToOpen.push(textUrl);

          if (urlsToOpen.length > 0) {
            await Promise.all(urlsToOpen.map((url) => open(url)));
            await toast.hide();
            const contentDesc =
              urlsToOpen.length > 1
                ? "Table of Contents & Content Text"
                : urlsToOpen[0].endsWith(TOC_SUFFIX)
                  ? "Table of Contents"
                  : "Content Text";
            await showHUD(`✓ ${contentDesc} opened`);
          } else {
            await open(baseUrl);
            await toast.hide();
            await showToast({
              style: Toast.Style.Success,
              title: "Catalog Entry Opened",
              message: "No digitized content available",
            });
          }

          await popToRoot();
          if (!cancelled) setIsLoading(false);
        }
      } catch (error) {
        await toast.hide();
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
        console.error("DNB Book Lookup Error:", error);
        if (!cancelled) setIsLoading(false);
      }
    }

    runCommand();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="# Looking up book information..." />;
  }

  if (showDetail && result && bookInfo) {
    return (
      <KlappentextView
        result={result}
        tocUrl={bookInfo.tocUrl}
        isbn={bookInfo.isbn}
        title={bookInfo.title}
        author={bookInfo.author}
      />
    );
  }

  return (
    <Detail
      markdown="# DNB Book Lookup\n\nThis command has finished. Check Raycast notifications or your browser if content was opened.\n\nPress **Escape** to close."
      actions={
        <ActionPanel>
          <Action title="Close" onAction={() => popToRoot()} />
        </ActionPanel>
      }
    />
  );
}
