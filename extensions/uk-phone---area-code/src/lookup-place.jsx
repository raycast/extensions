import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { codes } from "./area-codes";

// Special locations and services
const specialServices = {
  emergency: "999 - Emergency Services",
  police: "101 - Police Non-emergency",
  nhs: "111 - NHS Non-emergency",
  ambulance: "999 - Emergency Services",
  fire: "999 - Emergency Services",
  health: "111 - NHS Non-emergency",
  covid: "119 - COVID-19 Vaccination Helpline",
  "power cut": "105 - Power Cut Emergency Line",
  operator: "100 - Operator",
  "speaking clock": "123 - Speaking Clock",
  time: "123 - Speaking Clock",
  "directory enquiries": "195 - Directory Enquiries for People with Disabilities",
  "who called": "1471 - Who Called Service",
  withhold: "141 - Withhold Your Number",
  "hide number": "141 - Withhold Your Number",
  mobile: "07 - UK Mobile",
  cellphone: "07 - UK Mobile",
  "cell phone": "07 - UK Mobile",
  vodafone: "077/078 - Vodafone Mobile",
  o2: "070/071/072 - O2 Mobile",
  ee: "074 - EE Mobile",
  "bt mobile": "075 - BT Mobile",
  three: "074/075 - Three Mobile",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [matches, setMatches] = useState([]);

  // Fuzzy matching for strings (handles slight spelling mistakes)
  function fuzzyMatch(str1, str2, threshold = 0.7) {
    if (!str1 || !str2) return false;

    // Convert inputs to lowercase for case-insensitive matching
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Quick exact match check
    if (s1 === s2) return true;

    // Check if one string contains the other
    if (s1.includes(s2) || s2.includes(s1)) return true;

    // Levenshtein distance calculation for fuzzy matching
    const len1 = s1.length;
    const len2 = s2.length;

    // If length difference is too great, strings are likely not similar
    if (Math.abs(len1 - len2) > Math.min(len1, len2) * 0.5) return false;

    // Simple implementation of Levenshtein distance
    const dp = Array(len1 + 1)
      .fill()
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    // Calculate similarity score
    const maxLen = Math.max(len1, len2);
    const distance = dp[len1][len2];
    const similarity = 1 - distance / maxLen;

    return similarity >= threshold;
  }

  function performSearch(text) {
    if (!text || text.length < 2) {
      setMatches([]);
      return;
    }

    // Normalize input: lowercase and trim
    const normalizedPlace = text.toLowerCase().trim();

    // Find all area codes for places that match the search term
    let specialMatches = [];
    let exactMatches = [];
    let partialMatches = [];
    let fuzzyMatches = [];

    // Use a Set to track unique combinations of code and location
    const processedCombinations = new Set();

    // First check for special service matches
    for (const [service, details] of Object.entries(specialServices)) {
      if (normalizedPlace.includes(service) || fuzzyMatch(normalizedPlace, service, 0.8)) {
        const [code, description] = details.split(" - ");
        const uniqueKey = `${code}:${description}`;

        if (!processedCombinations.has(uniqueKey)) {
          specialMatches.push({ code: code, location: description, isSpecial: true });
          processedCombinations.add(uniqueKey);
        }
      }
    }

    // Then check for area codes for locations
    for (const [code, location] of Object.entries(codes)) {
      // Skip entries like '01', '02' which are not actual area codes
      if (code.length < 3) continue;

      const normalizedLocation = location.toLowerCase();
      // Create a unique key for this combination to avoid duplicates
      const uniqueKey = `${code}:${location}`;

      if (processedCombinations.has(uniqueKey)) continue;

      // Check for exact matches first (either whole name or word boundary)
      if (
        normalizedLocation === normalizedPlace ||
        normalizedLocation.startsWith(normalizedPlace + " ") ||
        normalizedLocation.includes(" " + normalizedPlace + " ") ||
        normalizedLocation.endsWith(" " + normalizedPlace)
      ) {
        exactMatches.push({ code, location });
        processedCombinations.add(uniqueKey);
      }
      // Then check for partial matches
      else if (normalizedLocation.includes(normalizedPlace)) {
        partialMatches.push({ code, location });
        processedCombinations.add(uniqueKey);
      }
      // Finally, try fuzzy matching for potential spelling mistakes
      else if (fuzzyMatch(normalizedPlace, normalizedLocation)) {
        fuzzyMatches.push({ code, location });
        processedCombinations.add(uniqueKey);
      }
    }

    // Combine matches in priority order
    setMatches([...specialMatches, ...exactMatches, ...partialMatches, ...fuzzyMatches]);
  }

  return (
    <List
      isLoading={false}
      onSearchTextChange={(text) => {
        setSearchText(text);
        performSearch(text);
      }}
      searchBarPlaceholder="Enter a place name or service..."
      throttle={true}
    >
      {matches.length > 0 ? (
        <List.Section title="Results" subtitle={`${matches.length} found`}>
          {matches.map((item, index) => (
            <List.Item
              key={`${item.code}-${item.location}-${index}`}
              title={item.location}
              subtitle={item.code}
              accessories={item.isSpecial ? [{ text: "Special Service" }] : []}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Location and Area Code"
                    content={`${item.location}: ${item.code}`}
                    onCopy={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Copied to clipboard",
                      });
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Area Code Only"
                    content={item.code}
                    onCopy={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Area code copied to clipboard",
                      });
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Location Only"
                    content={item.location}
                    onCopy={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Location copied to clipboard",
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : searchText.length > 0 ? (
        <List.EmptyView
          title="No Results"
          description="No places found matching your search term. Try a different search term."
        />
      ) : (
        <List.EmptyView
          title="Enter a place name"
          description="Type at least 2 characters to search for matching places."
        />
      )}
    </List>
  );
}
