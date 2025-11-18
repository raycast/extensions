/**
 * Search Hash Command
 *
 * Dedicated command for searching file hashes (MD5, SHA1, SHA256)
 */

import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { detectHash } from "./utils/ioc-detection";
import { getEnabledSourcesForIOCType } from "./utils/osint-sources";
import { buildSearchURL } from "./utils/url-builder";
import { ExtensionPreferences, SearchResult, HashType } from "./types";

interface SearchHashArguments {
  hash?: string;
}

export default function SearchHashCommand(
  props: LaunchProps<{ arguments: SearchHashArguments }>,
) {
  const [searchText, setSearchText] = useState(props.arguments.hash || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [hashType, setHashType] = useState<HashType>("unknown");

  useEffect(() => {
    const performSearch = async () => {
      if (!searchText.trim()) {
        setSearchResults([]);
        setIsValid(false);
        setHashType("unknown");
        return;
      }

      setIsLoading(true);

      try {
        const preferences = getPreferenceValues<ExtensionPreferences>();
        const trimmedHash = searchText.trim();

        // Validate hash
        const hashDetection = detectHash(trimmedHash);
        if (!hashDetection.isValid || !hashDetection.hashType) {
          setIsValid(false);
          setHashType("unknown");
          setSearchResults([]);
          setIsLoading(false);
          return;
        }

        setIsValid(true);
        setHashType(hashDetection.hashType);

        // Get enabled sources for hash
        const sources = await getEnabledSourcesForIOCType("hash", preferences);

        // Build search results
        const results: SearchResult[] = [];
        for (const source of sources) {
          const url = await buildSearchURL(
            source.id,
            hashDetection.value,
            "hash",
          );
          results.push({
            source,
            url,
            ioc: hashDetection.value,
            iocType: "hash",
          });
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Error searching hash:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            error instanceof Error ? error.message : "Failed to search hash",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const getHashTypeLabel = (type: HashType): string => {
    const labels: Record<HashType, string> = {
      md5: "MD5 Hash (32 characters)",
      sha1: "SHA1 Hash (40 characters)",
      sha256: "SHA256 Hash (64 characters)",
      unknown: "Unknown Hash Type",
    };
    return labels[type];
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter file hash (MD5, SHA1, or SHA256)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!searchText && (
        <List.EmptyView
          icon={{ source: Icon.Document, tintColor: Color.Red }}
          title="Search File Hashes"
          description="Enter an MD5, SHA1, or SHA256 hash to search across malware analysis platforms"
        />
      )}

      {searchText && !isValid && (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Invalid Hash"
          description="Please enter a valid MD5 (32 hex), SHA1 (40 hex), or SHA256 (64 hex) hash"
        />
      )}

      {isValid && searchResults.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="No Sources Available"
          description="No OSINT sources are enabled for file hashes. Check your preferences."
        />
      )}

      {isValid && searchResults.length > 0 && (
        <List.Section
          title={getHashTypeLabel(hashType)}
          subtitle={`${searchResults.length} sources`}
        >
          {searchResults.map((result) => (
            <List.Item
              key={result.source.id}
              id={result.source.id}
              title={result.source.name}
              subtitle={result.source.description}
              accessories={[{ text: result.source.category }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title={`Search in ${result.source.name}`}
                    url={result.url}
                  />
                  <Action.CopyToClipboard
                    title="Copy Search URL"
                    content={result.url}
                  />
                  <Action.CopyToClipboard
                    title="Copy Hash"
                    content={result.ioc}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
