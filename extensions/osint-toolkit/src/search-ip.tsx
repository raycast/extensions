/**
 * Search IP Command
 *
 * Dedicated command for searching IP addresses
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
import { detectIOCType } from "./utils/ioc-detection";
import { getEnabledSourcesForIOCType } from "./utils/osint-sources";
import { buildSearchURL } from "./utils/url-builder";
import { ExtensionPreferences, SearchResult } from "./types";

interface SearchIPArguments {
  ip?: string;
}

export default function SearchIPCommand(
  props: LaunchProps<{ arguments: SearchIPArguments }>,
) {
  const [searchText, setSearchText] = useState(props.arguments.ip || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [ipType, setIpType] = useState<"ipv4" | "ipv6">("ipv4");

  useEffect(() => {
    const performSearch = async () => {
      if (!searchText.trim()) {
        setSearchResults([]);
        setIsValid(false);
        return;
      }

      setIsLoading(true);

      try {
        const preferences = getPreferenceValues<ExtensionPreferences>();
        const trimmedIP = searchText.trim();

        const detection = detectIOCType(trimmedIP) as {
          isValid: boolean;
          type?: "ip" | "ipv6" | undefined;
        };

        if (
          !detection?.isValid ||
          (detection.type !== "ip" && detection.type !== "ipv6")
        ) {
          setIsValid(false);
          setSearchResults([]);
          setIsLoading(false);
          return;
        }

        const detectedType = detection.type!;
        setIsValid(true);
        setIpType(detectedType === "ipv6" ? "ipv6" : "ipv4");

        const sources = await getEnabledSourcesForIOCType(
          detectedType,
          preferences,
        );

        const results: SearchResult[] = [];
        for (const source of sources) {
          const url = await buildSearchURL(source.id, trimmedIP, detectedType);
          results.push({
            source,
            url,
            ioc: trimmedIP,
            iocType: detectedType,
          });
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Error searching IP:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            error instanceof Error ? error.message : "Failed to search IP",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const ipIcon = ipType === "ipv6" ? Icon.Globe : Icon.Network;
  const ipLabel = ipType === "ipv6" ? "IPv6" : "IPv4";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter IP address (e.g., 8.8.8.8 or 2001:4860:4860::8888)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!searchText && (
        <List.EmptyView
          icon={{ source: Icon.Network, tintColor: Color.Blue }}
          title="Search IP Addresses"
          description="Enter an IPv4 or IPv6 address to search across threat intelligence platforms"
        />
      )}

      {searchText && !isValid && (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Invalid IP Address"
          description="Please enter a valid IPv4 or IPv6 address"
        />
      )}

      {isValid && searchResults.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="No Sources Available"
          description="No OSINT sources are enabled for IP addresses. Check your preferences."
        />
      )}

      {isValid && searchResults.length > 0 && (
        <List.Section
          title={`${ipLabel} Address`}
          subtitle={`${searchResults.length} sources`}
        >
          {searchResults.map((result: SearchResult) => (
            <List.Item
              key={result.source.id}
              id={result.source.id}
              icon={{ source: ipIcon, tintColor: Color.Blue }}
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
                    title="Copy Ip Address"
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
