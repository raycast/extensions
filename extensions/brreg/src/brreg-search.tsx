import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch"; // If your Node version < 18

interface EnheterResponse {
  _embedded?: {
    enheter?: Enhet[];
  };
}

interface Enhet {
  organisasjonsnummer: string;
  navn: string;
  forretningsadresse?: {
    land?: string;
    landkode?: string;
    postnummer?: string;
    poststed?: string;
    adresse?: string[];
    kommune?: string;
    kommunenummer?: string;
  };
}

// Helper function to format address
function formatAddress(addr?: Enhet["forretningsadresse"]): string {
  if (!addr) {
    return "";
  }
  const street = addr.adresse?.join(", ") ?? "";
  const post = [addr.postnummer, addr.poststed].filter(Boolean).join(" ");
  const country = addr.land ?? "Norge";

  return [street, post, country].filter(Boolean).join(", ");
}

// Helper function to detect numeric vs text input
function isAllDigits(str: string) {
  return /^\d+$/.test(str);
}

export default function SearchAndCopyCommand() {
  const [searchText, setSearchText] = useState("");
  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If empty, clear results
    if (!searchText.trim()) {
      setEnheter([]);
      return;
    }

    // If user typed only digits, use ?organisasjonsnummer=, else ?navn=
    const isNumeric = isAllDigits(searchText.trim());
    // Org. No.'s are exactly 9 digits in Norway
    const paramName = isNumeric && searchText.trim().length === 9 ? "organisasjonsnummer" : "navn";

    async function fetchEnheter() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://data.brreg.no/enhetsregisteret/api/enheter?${paramName}=${encodeURIComponent(searchText)}`,
        );
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        const data = (await response.json()) as EnheterResponse;
        setEnheter(data._embedded?.enheter || []);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch enheter", (error as { message?: string })?.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEnheter();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search for name or organisation number"
    >
      {enheter.map((enhet) => {
        const addressString = formatAddress(enhet.forretningsadresse);
        return (
          <List.Item
            key={enhet.organisasjonsnummer}
            title={enhet.navn}
            subtitle={enhet.organisasjonsnummer}
            accessories={addressString ? [{ text: addressString }] : []}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={enhet.organisasjonsnummer} title="Copy Org.nr." />
                {addressString && <Action.CopyToClipboard content={addressString} title="Copy Forretningsadresse" />}
                <Action.OpenInBrowser
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  title="Open in Brønnøysund Register Center"
                  url={`https://virksomhet.brreg.no/nb/oppslag/enheter/${enhet.organisasjonsnummer}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
