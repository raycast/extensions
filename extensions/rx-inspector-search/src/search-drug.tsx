import { ActionPanel, Action, List, showToast, Toast, open } from "@raycast/api";
import { useState } from "react";
import * as cheerio from "cheerio";

interface DrugResult {
  ndc: string;
  name: string;
  company: string;
  dosage: string;
  description: string;
  url: string;
}

export default function Command() {
  const [results, setResults] = useState<DrugResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  async function handleSearch(text: string) {
    setSearchText(text);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const url = `https://projects.propublica.org/rx-inspector/search/?name=${encodeURIComponent(text.trim())}&labeler=`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const drugs: DrugResult[] = [];

      // Find all drug links
      $('a[href*="/labels/"]').each((_, element) => {
        const $link = $(element);
        const name = $link.text().trim();
        const href = $link.attr("href") || "";

        if (!name || name.length < 3) return;

        // Navigate up to find the container with all the info
        const $container = $link.closest("div").parent().parent();
        const fullText = $container.text();

        // Extract NDC
        const ndcMatch = fullText.match(/NDC:\s*([\dX-]+)/i);
        const ndc = ndcMatch ? ndcMatch[1] : "";

        // Extract company - comes after "Company"
        const companyMatch = fullText.match(/Company([A-Za-z\s-]+?)(?=Dosage)/);
        const company = companyMatch ? companyMatch[1].trim() : "";

        // Extract dosage amount
        const dosageMatch = fullText.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|unit))/i);
        const dosage = dosageMatch ? dosageMatch[1] : "";

        // Extract description (color and form)
        const descMatch = fullText.match(
          /((?:White|Red|Blue|Yellow|Pink|Green|Orange|Brown|Purple|Black|Gray|Tan|Peach|Turquoise|Beige|Light)[^\n]+(?:tablet|capsule|solution|injection)[^\n]*)/i,
        );
        const description = descMatch ? descMatch[1].trim().substring(0, 60) : "";

        // Build the full URL
        const fullUrl = href.startsWith("..")
          ? `https://projects.propublica.org/rx-inspector${href.substring(2)}`
          : `https://projects.propublica.org${href}`;

        if (name && ndc) {
          drugs.push({
            ndc,
            name,
            company,
            dosage,
            description,
            url: fullUrl,
          });
        }
      });

      setResults(drugs);

      if (drugs.length === 0) {
        showToast({ style: Toast.Style.Failure, title: "No results found", message: "Try a different search term" });
      } else {
        showToast({ style: Toast.Style.Success, title: `Found ${drugs.length} results` });
      }
    } catch (error) {
      console.error("Search error:", error);
      showToast({ style: Toast.Style.Failure, title: "Search failed", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search drug name (e.g., metformin)"
      onSearchTextChange={handleSearch}
      throttle
    >
      {results.length === 0 && !isLoading ? (
        <List.EmptyView
          title="Search for a Drug"
          description="Enter a generic drug name to search ProPublica's RX Inspector"
        />
      ) : (
        results.map((drug, index) => (
          <List.Item
            key={`${drug.ndc}-${index}`}
            title={drug.name}
            subtitle={drug.description || drug.dosage}
            accessories={[{ text: drug.company }, { tag: drug.ndc }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="View Details" url={drug.url} />
                <Action.CopyToClipboard title="Copy NDC" content={drug.ndc} />
                <Action.CopyToClipboard title="Copy Drug Name" content={drug.name} />
                <Action
                  title="Open Full Search in Browser"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={() =>
                    open(
                      `https://projects.propublica.org/rx-inspector/search/?name=${encodeURIComponent(searchText)}&labeler=`,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
