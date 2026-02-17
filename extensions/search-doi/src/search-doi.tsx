import { List, ActionPanel, Action, Icon, Clipboard, showToast, Toast, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

// === Interfaces ===

interface CrossrefResponse {
  message: {
    title: string[];
    author?: { given: string; family: string }[];
    "container-title"?: string[];
    publisher: string;
    "publisher-location"?: string;
    created?: { "date-parts": number[][] };
    URL: string;
    abstract?: string;
    volume?: string | number;
    issue?: string | number;
    page?: string | number;
    DOI: string;
  };
}

// === Helpers ===

function decodeHTMLEntities(text?: string) {
  if (!text) return "";
  let clean = text.replace(/<[^>]+>/g, "");
  clean = clean.replace(/&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});/gi, (match, code) => {
    if (code.charAt(0) === "#") {
      if (code.charAt(1) === "x") return String.fromCharCode(parseInt(code.substring(2), 16));
      return String.fromCharCode(parseInt(code.substring(1), 10));
    }
    const entities: { [key: string]: string } = {
      amp: "&",
      quot: '"',
      apos: "'",
      lt: "<",
      gt: ">",
      ndash: "-",
      mdash: "—",
      rsquo: "’",
      lsquo: "‘",
      colon: ":",
      semi: ";",
      copyright: "©",
      reg: "®",
    };
    return entities[code.toLowerCase()] || match;
  });
  return clean.trim();
}

function cleanAbstract(xmlString?: string) {
  if (!xmlString) return null;
  const clean = xmlString
    .replace(/<jats:title>.*?<\/jats:title>/gi, "")
    .replace(/<title>.*?<\/title>/gi, "")
    .replace(/<\/jats:p>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/jats:sec>/gi, "\n");

  return decodeHTMLEntities(clean)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");
}

function getInitials(name: string) {
  return name
    .split(/[ -]/)
    .filter((n) => n.length > 0)
    .map((n) => n[0].toUpperCase() + ".")
    .join(" ");
}

// List Authors (Title View) - "Smith et al."
function formatListAuthors(authors?: { given: string; family: string }[]) {
  if (!authors || authors.length === 0) return "Unknown";
  if (authors.length > 3) return `${authors[0].family} et al.`;
  const families = authors.map((a) => a.family);
  if (families.length === 1) return families[0];
  return families.join(", ").replace(/, ([^,]*)$/, " & $1");
}

// APA Authors - "&" before last
function formatAPAAuthors(authors?: { given: string; family: string }[]) {
  if (!authors || authors.length === 0) return "Unknown Author";
  const names = authors.map((a) => `${a.family}, ${getInitials(a.given || "")}`);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  const allButLast = names.slice(0, -1).join(", ");
  const last = names[names.length - 1];
  return `${allButLast}, & ${last}`;
}

// === Generators ===

const generateRef = {
  txt: (w: CrossrefResponse["message"]) => {
    const authors = formatAPAAuthors(w.author);
    const year = w.created?.["date-parts"]?.[0]?.[0] || "n.d.";
    const journal = w["container-title"]?.[0] || "Unknown Journal";
    const title = decodeHTMLEntities(w.title?.[0]);
    return `${authors} (${year}). ${title}. ${journal}, ${w.volume || ""}(${w.issue || ""}), ${w.page || ""}. https://doi.org/${w.DOI}`;
  },

  html: (w: CrossrefResponse["message"]) => {
    const authors = formatAPAAuthors(w.author);
    const year = w.created?.["date-parts"]?.[0]?.[0] || "n.d.";
    const title = decodeHTMLEntities(w.title?.[0]);
    const journal = w["container-title"]?.[0] || "Unknown Journal";
    const doi = `https://doi.org/${w.DOI}`;
    return `
	  ${authors} (${year}). 
	  ${title}. 
	  <i>${journal}</i>, 
	  <i>${w.volume || ""}</i>(${w.issue || ""}), 
	  ${w.page || ""}. 
	  <a href="${doi}">${doi}</a>
	`;
  },

  bibtex: (w: CrossrefResponse["message"]) => {
    const year = w.created?.["date-parts"]?.[0]?.[0] || "n.d.";
    const id = `${w.author?.[0]?.family || "Unknown"}${year}`;
    const authors = w.author?.map((a) => `${a.family}, ${a.given}`).join(" and ");
    const title = decodeHTMLEntities(w.title?.[0]);

    return `@article{${id},
  title = {${title}},
  author = {${authors || "Unknown"}},
  journal = {${w["container-title"]?.[0] || ""}},
  publisher = {${w.publisher || ""}},
  address = {${w["publisher-location"] || ""}},
  year = {${year}},
  volume = {${w.volume || ""}},
  number = {${w.issue || ""}},
  pages = {${w.page || ""}},
  doi = {${w.DOI}},
  url = {${w.URL}}
}`;
  },

  ris: (w: CrossrefResponse["message"]) => {
    let ris = "TY  - JOUR\n";
    ris += `TI  - ${decodeHTMLEntities(w.title?.[0])}\n`;
    w.author?.forEach((a) => {
      ris += `AU  - ${a.family}, ${a.given}\n`;
    });
    ris += `JO  - ${w["container-title"]?.[0] || ""}\n`;
    if (w.publisher) ris += `PB  - ${w.publisher}\n`;
    if (w["publisher-location"]) ris += `CY  - ${w["publisher-location"]}\n`;

    const year = w.created?.["date-parts"]?.[0]?.[0];
    if (year) ris += `PY  - ${year}\n`;

    const vol = String(w.volume || "");
    if (vol.length > 0) ris += `VL  - ${vol}\n`;

    const iss = String(w.issue || "");
    if (iss.length > 0) ris += `IS  - ${iss}\n`;

    const pages = String(w.page || "");
    if (pages.length > 0) {
      const parts = pages.split("-");
      ris += `SP  - ${parts[0]}\n`;
      if (parts[1]) ris += `EP  - ${parts[1]}\n`;
    }

    ris += `DO  - ${w.DOI}\n`;
    ris += `UR  - ${w.URL}\n`;
    ris += "ER  -";
    return ris;
  },

  csv: (w: CrossrefResponse["message"]) => {
    const headers = "DOI,Title,Authors,Journal,Publisher,Location,Year,Volume,Issue,Pages";
    const authors = w.author?.map((a) => `${a.given} ${a.family}`).join("; ");
    const year = w.created?.["date-parts"]?.[0]?.[0] || "";
    const title = decodeHTMLEntities(w.title?.[0]);
    const esc = (s: string | number | undefined) => {
      const str = s === undefined || s === null ? "" : String(s);
      return `"${str.replace(/"/g, '""')}"`;
    };
    const row = [
      w.DOI,
      title,
      authors,
      w["container-title"]?.[0],
      w.publisher,
      w["publisher-location"],
      year,
      w.volume,
      w.issue,
      w.page,
    ]
      .map(esc)
      .join(",");

    return `${headers}\n${row}`;
  },
};

function CopyAsRichText({ work, shortcut }: { work: CrossrefResponse["message"]; shortcut?: Keyboard.Shortcut }) {
  async function handleCopy() {
    const htmlContent = generateRef.html(work);
    const textContent = generateRef.txt(work);
    await Clipboard.copy({ html: htmlContent, text: textContent });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied APA Citation",
      message: "Formatted text copied to clipboard",
    });
  }
  return <Action title="Copy APA (Formatted)" icon={Icon.TextDocument} onAction={handleCopy} shortcut={shortcut} />;
}

// === Main Component ===

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data } = useFetch<CrossrefResponse>(
    searchText ? `https://api.crossref.org/works/${searchText}` : null,
    { execute: !!searchText },
  );

  const work = data?.message;

  const fullAuthorList = work?.author
    ? work.author.map((a) => `**${a.given} ${a.family}**`).join(", ")
    : "_Unknown Author_";

  const metaAuthorList = work?.author ? work.author.map((a) => `${a.given} ${a.family}`).join(", ") : "Unknown";

  const pubDate = work?.created?.["date-parts"]?.[0]?.join("-") || "N/A";
  const pubYear = work?.created?.["date-parts"]?.[0]?.[0] || "n.d."; // For Title

  const abstractText = work?.abstract ? cleanAbstract(work.abstract) : null;
  const abstractDisplay = abstractText
    ? `### Abstract\n\n${abstractText}`
    : `### Abstract\n\n> *Not available for this article.*\n>\n> Some publishers (e.g. Elsevier, The Lancet) do not provide abstracts in the public Crossref database.`;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste DOI (e.g., 10.1038/s41586-020-2649-2)..."
      throttle
      isShowingDetail
    >
      {work && (
        <List.Item
          title={`${formatListAuthors(work.author)} (${pubYear})`}
          subtitle={decodeHTMLEntities(work.title?.[0])}
          detail={
            <List.Item.Detail
              markdown={`# ${decodeHTMLEntities(work.title?.[0])}\n\n${fullAuthorList}\n\n---\n${abstractDisplay}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Journal"
                    text={work["container-title"]?.[0] || work.publisher}
                  />
                  <List.Item.Detail.Metadata.Label title="Publisher" text={work.publisher} />
                  {work["publisher-location"] && (
                    <List.Item.Detail.Metadata.Label title="Location" text={work["publisher-location"]} />
                  )}
                  <List.Item.Detail.Metadata.Label title="Publication Date" text={pubDate} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Authors" text={metaAuthorList} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Volume" text={work.volume ? String(work.volume) : "-"} />
                  <List.Item.Detail.Metadata.Label title="Issue" text={work.issue ? String(work.issue) : "-"} />
                  <List.Item.Detail.Metadata.Label title="Pages" text={work.page ? String(work.page) : "-"} />
                  <List.Item.Detail.Metadata.Link title="View DOI" target={work.URL} text={work.DOI} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={work.URL} />

              <ActionPanel.Submenu
                title="Get Reference"
                icon={Icon.Quote}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              >
                <CopyAsRichText work={work} shortcut={{ modifiers: ["cmd", "shift"], key: "a" }} />
                <Action.CopyToClipboard
                  title="Copy as BibTeX"
                  content={generateRef.bibtex(work)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                />
                <Action.CopyToClipboard
                  title="Copy as RIS"
                  content={generateRef.ris(work)}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
                />
                <Action.CopyToClipboard
                  title="Copy as CSV"
                  content={generateRef.csv(work)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Submenu>

              <ActionPanel.Section title="Quick Actions">
                <Action.CopyToClipboard content={work.URL} title="Copy URL" />
                <Action.CopyToClipboard content={metaAuthorList} title="Copy Authors" />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
