import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { codes } from "./area-codes";

// Special numbers and mobile prefixes
const specialNumbers = {
  999: "Emergency Services",
  111: "NHS Non-emergency",
  101: "Police Non-emergency",
  100: "Operator",
  123: "Speaking Clock",
  155: "International Operator",
  195: "Directory Enquiries for People with Disabilities",
  112: "European Emergency Number",
  105: "Power Cut Emergency Line",
  119: "COVID-19 Vaccination Helpline",
  141: "Withhold Your Number",
  1471: "Who Called Service",
};

const mobileNetworks = {
  "07": "UK Mobile",
  "071": "UK Personal Number",
  "072": "UK Mobile",
  "073": "UK Mobile",
  "074": "UK Mobile",
  "075": "UK Mobile",
  "076": "UK Mobile/Pager",
  "077": "UK Mobile",
  "078": "UK Mobile",
  "079": "UK Mobile",
};

// More specific mobile network identification
const specificMobileNetworks = {
  "07400": "EE",
  "07401": "EE",
  "07402": "EE",
  "07403": "EE",
  "07575": "EE/BT",
  "07576": "EE/BT",
  "07577": "EE/BT",
  "07578": "EE/BT",
  "07700": "O2",
  "07701": "O2",
  "07702": "O2",
  "07703": "O2",
  "07704": "O2",
  "07705": "O2",
  "07706": "O2",
  "07707": "O2",
  "07708": "O2",
  "07709": "O2",
  "07710": "O2",
  "07711": "O2",
  "07712": "O2",
  "077130": "O2",
  "077131": "O2",
  "077132": "O2",
  "077770": "Vodafone",
  "077771": "Vodafone",
  "077772": "Vodafone",
  "077773": "Vodafone",
  "077778": "Vodafone",
  "077779": "Vodafone",
  "07778": "Vodafone",
  "07797": "Vodafone",
  "07800": "Vodafone",
  "07801": "Vodafone",
  "07802": "Vodafone",
  "07803": "Vodafone",
  "07804": "Vodafone",
  "07805": "Vodafone",
  "07806": "Vodafone",
  "07807": "Vodafone",
  "07808": "Vodafone",
  "07809": "Vodafone",
  "0745": "Three",
  "0746": "Three",
  "0747": "Three",
  "07481": "Three",
  "0748288": "Three",
  "0748297": "Three",
  "0748298": "Three",
  "0748299": "Three",
  "0749": "Three",
};

// Debounce function to limit API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Function to fetch mobile network details from telecom-tariffs.co.uk
async function fetchMobileDetails(mobileNumber) {
  if (!mobileNumber || !mobileNumber.startsWith("07")) return null;

  try {
    const formData = new URLSearchParams();
    formData.append("PartCode", mobileNumber);
    formData.append("OwnCode", "");
    formData.append("PartName", "");
    formData.append("cmdLookup", "Lookup Number");

    const response = await fetch("https://www.telecom-tariffs.co.uk/codelook.htm", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const html = await response.text();

    // Parse the HTML to extract the mobile network details
    // We're looking for the table row with bgcolor="#FFFF99"
    const tableRowMatch = html.match(/<tr bgcolor="#FFFF99">([\s\S]*?)<\/tr>/);
    if (!tableRowMatch) return null;

    const tableRow = tableRowMatch[1];

    // Extract specific data from the table cells
    const extractTableCell = (row, cellIndex) => {
      const cells = row.match(/<td>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length <= cellIndex) return "";

      const cellContent = cells[cellIndex];
      // Remove HTML tags and clean up
      return cellContent
        .replace(/<td>/g, "")
        .replace(/<\/td>/g, "")
        .replace(/<a[^>]*>/g, "")
        .replace(/<\/a>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
    };

    // Extract locality/use, service, charging, operator
    const locality = extractTableCell(tableRow, 1);
    const service = extractTableCell(tableRow, 2);
    const charging = extractTableCell(tableRow, 3);
    const operator = extractTableCell(tableRow, 4);
    const status = extractTableCell(tableRow, 5);

    return {
      locality,
      service,
      charging,
      operator,
      status,
    };
  } catch (error) {
    console.error("Error fetching mobile details:", error);
    return null;
  }
}

// Function to check if a number is a valid UK mobile number
function isValidUKMobileNumber(number) {
  if (!number || typeof number !== "string") return false;

  // Must start with 07
  if (!number.startsWith("07")) return false;

  // UK mobile numbers are 11 digits (including the leading 0)
  if (number.length !== 11) return false;

  // All characters must be digits
  if (!/^\d+$/.test(number)) return false;

  // Known mobile prefixes (this is a simplified check)
  const validPrefixes = [
    "07[1-9]", // General mobile prefixes
  ];

  return validPrefixes.some((prefix) => {
    const regex = new RegExp(`^${prefix}`);
    return regex.test(number);
  });
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileDetails, setMobileDetails] = useState({});

  // Debounced function to fetch mobile details
  const debouncedFetchMobileDetails = useCallback(
    debounce(async (mobileNumber) => {
      // Only proceed if it's a valid UK mobile number
      if (!isValidUKMobileNumber(mobileNumber)) return;

      // Don't fetch again if we already have the details for this number
      if (mobileDetails[mobileNumber]) return;

      setIsLoading(true);
      try {
        const details = await fetchMobileDetails(mobileNumber);
        if (details) {
          setMobileDetails((prev) => ({
            ...prev,
            [mobileNumber]: details,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch mobile details:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [mobileDetails],
  );

  // Function to normalize phone number input from various formats
  function normalizePhoneNumber(input) {
    if (!input) return "";

    // Remove all non-digit characters
    let digits = input.replace(/\D/g, "");

    // Handle various UK phone number formats
    if (digits.startsWith("44")) {
      // +44 format: remove the country code and add 0
      digits = "0" + digits.substring(2);
    } else if (digits.startsWith("0044")) {
      // 0044 format: remove the country code and keep the 0
      digits = "0" + digits.substring(4);
    } else if (!digits.startsWith("0") && digits.length > 3) {
      // If the number doesn't start with 0 and is reasonably long, add it
      digits = "0" + digits;
    }

    return digits;
  }

  // Function to extract area code from a full phone number
  function extractAreaCode(fullNumber) {
    // Try to find the area code directly from the codes object
    // by testing progressively shorter prefixes
    for (let i = Math.min(fullNumber.length, 6); i >= 3; i--) {
      const prefix = fullNumber.substring(0, i);
      if (codes[prefix]) {
        return prefix;
      }
    }

    // Check for special numbers
    if (specialNumbers[fullNumber.replace(/^0+/, "")]) {
      return fullNumber.replace(/^0+/, "");
    }

    // Check for specific mobile networks
    for (let i = Math.min(fullNumber.length, 7); i >= 4; i--) {
      const prefix = fullNumber.substring(0, i);
      if (specificMobileNetworks[prefix]) {
        return prefix;
      }
    }

    // Check for general mobile prefix
    for (let i = Math.min(fullNumber.length, 3); i >= 2; i--) {
      const prefix = fullNumber.substring(0, i);
      if (mobileNetworks[prefix]) {
        return prefix;
      }
    }

    // If no direct match, try known patterns
    const areaCodePatterns = [
      { pattern: /^(01\d{3})/, extraction: (match) => match[1] }, // 5-digit area codes (01xxx)
      { pattern: /^(01\d{2})/, extraction: (match) => match[1] }, // 4-digit area codes (01xx)
      { pattern: /^(01\d)/, extraction: (match) => match[1] }, // 3-digit area codes (01x)
      { pattern: /^(02\d)/, extraction: (match) => match[1] }, // London and other 02x codes
      { pattern: /^(011\d)/, extraction: (match) => match[1] }, // Leeds, Sheffield, etc.
    ];

    for (const { pattern, extraction } of areaCodePatterns) {
      const match = fullNumber.match(pattern);
      if (match) {
        return extraction(match);
      }
    }

    return fullNumber;
  }

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

    // Normalize the input to handle various phone number formats
    const normalizedNumber = normalizePhoneNumber(text);

    // Try to extract area code if this appears to be a full phone number
    const searchNumber = normalizedNumber.length > 5 ? extractAreaCode(normalizedNumber) : normalizedNumber;

    // If this is a full, valid UK mobile number, fetch more details
    if (isValidUKMobileNumber(normalizedNumber)) {
      debouncedFetchMobileDetails(normalizedNumber);
    }

    // First look for exact matches (highest priority)
    let exactMatches = [];
    let prefixMatches = [];
    let substringMatches = [];
    let fuzzyMatches = [];

    // Use a Set to track unique combinations of code and location
    const processedCombinations = new Set();

    // 0. Check for special numbers and mobile numbers
    const stripLeadingZeros = searchNumber.replace(/^0+/, "");

    if (specialNumbers[stripLeadingZeros]) {
      const uniqueKey = `${stripLeadingZeros}:${specialNumbers[stripLeadingZeros]}`;
      if (!processedCombinations.has(uniqueKey)) {
        exactMatches.push({ code: stripLeadingZeros, location: specialNumbers[stripLeadingZeros], isSpecial: true });
        processedCombinations.add(uniqueKey);
      }
    }

    // Check for specific mobile network
    for (const [prefix, network] of Object.entries(specificMobileNetworks)) {
      if (normalizedNumber.startsWith(prefix)) {
        const uniqueKey = `${prefix}:${network}`;
        if (!processedCombinations.has(uniqueKey)) {
          exactMatches.push({
            code: prefix,
            location: `${network} Mobile Network`,
            isMobile: true,
            fullNumber: normalizedNumber,
          });
          processedCombinations.add(uniqueKey);
          break; // Found the most specific one
        }
      }
    }

    // Check for general mobile network
    if (exactMatches.length === 0) {
      for (const [prefix, type] of Object.entries(mobileNetworks)) {
        if (normalizedNumber.startsWith(prefix)) {
          const uniqueKey = `${prefix}:${type}`;
          if (!processedCombinations.has(uniqueKey)) {
            exactMatches.push({
              code: prefix,
              location: type,
              isMobile: true,
              fullNumber: normalizedNumber,
            });
            processedCombinations.add(uniqueKey);
            break; // Found a match
          }
        }
      }
    }

    // 1. Try exact match in regular area codes
    const exactMatch = codes[searchNumber];
    if (exactMatch) {
      const uniqueKey = `${searchNumber}:${exactMatch}`;
      if (!processedCombinations.has(uniqueKey)) {
        exactMatches.push({ code: searchNumber, location: exactMatch });
        processedCombinations.add(uniqueKey);
      }
    } else if (codes[normalizedNumber]) {
      // Also try with the original normalized input in case extraction didn't work
      const uniqueKey = `${normalizedNumber}:${codes[normalizedNumber]}`;
      if (!processedCombinations.has(uniqueKey)) {
        exactMatches.push({ code: normalizedNumber, location: codes[normalizedNumber] });
        processedCombinations.add(uniqueKey);
      }
    }

    // 2. Look for area codes that start with the input
    for (const [code, location] of Object.entries(codes)) {
      // Skip entries like '01', '02' which are not actual area codes
      if (code.length < 3) continue;

      const uniqueKey = `${code}:${location}`;
      if (processedCombinations.has(uniqueKey)) continue;

      if (code.startsWith(searchNumber)) {
        prefixMatches.push({ code, location });
        processedCombinations.add(uniqueKey);
      }
    }

    // Sort prefix matches by code length (shorter codes first)
    prefixMatches.sort((a, b) => a.code.length - b.code.length);

    // 3. Try substring matching if no exact or prefix matches
    if (exactMatches.length === 0 && prefixMatches.length === 0) {
      for (const [code, location] of Object.entries(codes)) {
        if (code.length < 3) continue;

        const uniqueKey = `${code}:${location}`;
        if (processedCombinations.has(uniqueKey)) continue;

        if (code.includes(searchNumber)) {
          substringMatches.push({ code, location });
          processedCombinations.add(uniqueKey);
        }
      }
    }

    // 4. Try fuzzy matching against place names
    // Only do this if the searchText looks like it might be a place rather than a number
    if (/[a-zA-Z]/.test(text) && text.length >= 3) {
      for (const [code, location] of Object.entries(codes)) {
        if (code.length < 3) continue;

        const uniqueKey = `${code}:${location}`;
        if (processedCombinations.has(uniqueKey)) continue;

        if (fuzzyMatch(text, location)) {
          fuzzyMatches.push({ code, location });
          processedCombinations.add(uniqueKey);
        }
      }
    }

    // Combine matches with priority and update state
    setMatches([...exactMatches, ...prefixMatches, ...substringMatches, ...fuzzyMatches]);
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        setSearchText(text);
        performSearch(text);
      }}
      searchBarPlaceholder="Enter area code or full phone number..."
      throttle={true}
    >
      {matches.length > 0 ? (
        <List.Section title="Results" subtitle={`${matches.length} found`}>
          {matches.map((item, index) => {
            // Check if we have additional mobile details
            const additionalDetails = item.isMobile && item.fullNumber && mobileDetails[item.fullNumber];

            const accessories = [];

            if (item.isSpecial) {
              accessories.push({ text: "Special Number" });
            } else if (item.isMobile) {
              accessories.push({ text: "Mobile" });
            }

            // Add any additional fetched details
            if (additionalDetails) {
              if (additionalDetails.operator && additionalDetails.operator !== item.location) {
                accessories.push({ text: additionalDetails.operator });
              }
              if (additionalDetails.service) {
                accessories.push({ text: additionalDetails.service });
              }
            }

            return (
              <List.Item
                key={`${item.code}-${item.location}-${index}`}
                title={item.code}
                subtitle={additionalDetails && additionalDetails.locality ? additionalDetails.locality : item.location}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Area Code and Location"
                      content={`${item.code} - ${item.location}`}
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
                    {additionalDetails && (
                      <Action.CopyToClipboard
                        title="Copy Full Details"
                        content={`${item.code} - ${additionalDetails.locality || item.location}
Operator: ${additionalDetails.operator || "Unknown"}
Service: ${additionalDetails.service || "Unknown"}
Charging: ${additionalDetails.charging || "Unknown"}
Status: ${additionalDetails.status || "Unknown"}`}
                        onCopy={() => {
                          showToast({
                            style: Toast.Style.Success,
                            title: "Full details copied to clipboard",
                          });
                        }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : searchText.length > 0 ? (
        <List.EmptyView
          title="No Results"
          description="No area codes found matching your search. Try a different search term."
        />
      ) : (
        <List.EmptyView
          title="Enter an area code or phone number"
          description="Type at least 2 digits to search for matching area codes."
        />
      )}
    </List>
  );
}
