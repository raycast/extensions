// @server
import * as cheerio from "cheerio";

export interface IQAirCityRanking {
  rank: number;
  city: string;
  countrySlug: string;
  aqi: number;
  url: string;
}

export interface IQAirSearchResult {
  id: string;
  name: string;
  state: string;
  country: string;
  url: string;
  aqi: number;
  estimated: boolean;
  latitude: number;
  longitude: number;
  followersCount: number;
}

export interface IQAirPollutant {
  name: string;
  description: string;
  value: number;
  unit: string;
}

export interface IQAirCityDetails extends IQAirCityRanking {
  level: string;
  mainPollutant: {
    name: string;
    value: number;
    unit: string;
  };
  pollutants: IQAirPollutant[];
}

/**
 * Server-side function: fetches HTML from IQAir and parses the
 * "Live AQI⁺ City Ranking" table from the World Air Quality page.
 *
 * This demonstrates the approach: HTML page + cheerio parsing on the server.
 * IQAir markup may change, so selectors should be considered "best effort".
 */
export async function fetchIQAirTopCities(limit: number = 10): Promise<IQAirCityRanking[]> {
  // IQAir page may show limited cities, so we try to get as many as possible
  // The actual limit depends on what's available on the page
  const response = await fetch("https://www.iqair.com/us/world-air-quality");

  if (!response.ok) {
    throw new Error(`IQAir HTML fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Find the table where the second and third headers contain "Cities" and "AQI"
  const table = $("table")
    .filter((_, el) => {
      const headers = $(el)
        .find("thead tr")
        .first()
        .find("th")
        .map((i, th) => $(th).text().trim())
        .get();

      return headers[1]?.includes("Cities") && headers[2]?.includes("AQI");
    })
    .first();

  if (!table || table.length === 0) {
    throw new Error("IQAir HTML structure: ranking table not found");
  }

  const rows = table.find("tbody tr");
  const result: IQAirCityRanking[] = [];

  rows.each((index, row) => {
    if (result.length >= limit) {
      return false; // break
    }

    const $row = $(row);
    const thRank = $row.find("th").first().text().trim();
    const tds = $row.find("td");

    if (tds.length < 2) {
      return;
    }

    const cityCell = $(tds[0]);
    const aqiCell = $(tds[1]);

    // Get city from <p> inside the first cell
    const city = cityCell.find("p").first().text().trim();

    // Get AQI from <p> inside the second cell
    const aqiText = aqiCell.find("p").first().text().trim();
    const aqi = Number.parseInt(aqiText, 10);

    // Link to specific city (last <a> in the row)
    const href =
      $row
        .find("a[href]")
        .last()
        .attr("href") ?? "";

    // Convert relative path to absolute URL
    const url = href.startsWith("http") ? href : `https://www.iqair.com${href}`;

    // Get country slug from URL: /us/{countrySlug}/...
    let countrySlug = "";
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split("/").filter(Boolean);
      // Expected structure: ["us", "{country}", ...]
      if (parts.length >= 2) {
        countrySlug = parts[1];
      }
    } catch {
      // ignore, leave empty
    }

    if (!city || Number.isNaN(aqi)) {
      return;
    }

    result.push({
      rank: Number.parseInt(thRank, 10) || index + 1,
      city,
      countrySlug,
      aqi,
      url,
    });
  });

  if (result.length === 0) {
    throw new Error("IQAir HTML parsing: no rows parsed from ranking table");
  }

  return result;
}

/**
 * Parse IQAir search response by finding URL patterns in the flat array.
 * IQAir uses a Remix/React Router data format where values are stored in a flat array.
 */
function parseIQAirSearchResponseSimple(data: unknown[]): IQAirSearchResult[] {
  const results: IQAirSearchResult[] = [];
  const seenUrls = new Set<string>();
  
  // The response contains city URLs in the format "/country/state/city"
  // Find all strings that match this pattern and extract nearby data
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // Look for URL strings that match city pattern
    if (typeof item === "string" && item.startsWith("/") && !item.includes(".")) {
      const parts = item.split("/").filter(Boolean);
      
      // City URLs have format: /country/state/city (3 parts) or /country/city (2 parts)
      // But we prefer 3-part URLs as they are more specific (actual cities, not regions)
      // Station URLs have 4+ parts, so we skip those
      if (parts.length >= 2 && parts.length <= 3) {
        // Skip if this looks like a station URL (has 4+ parts)
        if (parts.length > 3) continue;
        
        // Skip duplicate URLs
        if (seenUrls.has(item)) continue;
        seenUrls.add(item);
        
        // Extract city name from URL (last part)
        const citySlug = parts[parts.length - 1];
        const cityName = citySlug
          .split("-")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        
        const countrySlug = parts[0];
        const stateSlug = parts.length === 3 ? parts[1] : "";
        
        // Look around this index for AQI value
        // AQI is usually in a nearby object with "aqi" reference
        let aqi = 0;
        let estimated = false;
        let id = "";
        let latitude = 0;
        let longitude = 0;
        let followersCount = 0;
        
        // Search backwards for the city object that references this URL
        for (let j = Math.max(0, i - 30); j < i; j++) {
          const prevItem = data[j];
          
          // Look for ID (alphanumeric string before the URL)
          if (typeof prevItem === "string" && /^[a-zA-Z0-9]{10,}$/.test(prevItem) && !id) {
            id = prevItem;
          }
          
          // Look for numeric values that could be AQI
          if (typeof prevItem === "number" && prevItem > 0 && prevItem < 600 && !aqi) {
            // Check if this is likely AQI by position
            const nextItem = data[j + 1];
            if (nextItem === true || nextItem === false) {
              aqi = prevItem;
              estimated = nextItem as boolean;
            }
          }
          
          // Look for coordinates
          if (typeof prevItem === "number" && prevItem > -180 && prevItem < 180) {
            const nextItem = data[j + 1];
            if (typeof nextItem === "number" && nextItem > -180 && nextItem < 180) {
              // Could be lat/lon pair
              if (prevItem > -90 && prevItem < 90 && Math.abs(prevItem) > 1) {
                latitude = prevItem;
                longitude = nextItem;
              }
            }
          }
        }
        
        // Search forwards for followersCount and other data
        for (let j = i + 1; j < Math.min(data.length, i + 20); j++) {
          const nextItem = data[j];
          
          // Followers count is usually a large number
          if (typeof nextItem === "number" && nextItem > 100 && !followersCount) {
            followersCount = nextItem;
            break;
          }
        }
        
        results.push({
          id,
          name: cityName,
          state: stateSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          country: countrySlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          url: item,
          aqi,
          estimated,
          latitude,
          longitude,
          followersCount,
        });
      }
    }
  }
  
  // Sort by priority: 
  // 1. URLs with 3 parts (cities) over 2 parts (regions/states)
  // 2. Higher followersCount
  results.sort((a, b) => {
    const aParts = a.url.split("/").filter(Boolean).length;
    const bParts = b.url.split("/").filter(Boolean).length;
    
    // Prefer 3-part URLs (cities) over 2-part URLs (regions)
    if (aParts === 3 && bParts === 2) return -1;
    if (aParts === 2 && bParts === 3) return 1;
    
    // If same URL type, sort by followersCount
    return b.followersCount - a.followersCount;
  });
  
  return results;
}

/**
 * Search for cities using IQAir's search API.
 * This searches the entire IQAir database, not just top polluted cities.
 */
export async function searchIQAirCities(query: string): Promise<IQAirSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error("Search query is required");
  }

  const encodedQuery = encodeURIComponent(normalizedQuery);
  const url = `https://www.iqair.com/us/search-results.data?q=${encodedQuery}&_routes=routes%2F%24(locale).search-results`;

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; Raycast/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`IQAir search API failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  
  try {
    const data = JSON.parse(text) as unknown[];
    return parseIQAirSearchResponseSimple(data);
  } catch {
    throw new Error("Failed to parse IQAir search response");
  }
}

/**
 * Search for a city in IQAir using the search API.
 * This searches the entire IQAir database, not just top polluted cities.
 */
export async function fetchIQAirCityByName(
  cityName: string,
): Promise<IQAirCityRanking | null> {
  const normalizedQuery = cityName.trim().toLowerCase();
  if (!normalizedQuery) {
    throw new Error("City name is required");
  }

  const searchResults = await searchIQAirCities(cityName);
  
  if (searchResults.length === 0) {
    return null;
  }

  // Find best match - prioritize cities (3-part URLs) over regions (2-part URLs)
  // First, try exact match by city name (case-insensitive) with 3-part URL
  let found = searchResults.find((c) => {
    const urlParts = c.url.split("/").filter(Boolean).length;
    return c.name.toLowerCase() === normalizedQuery && urlParts === 3;
  });
  
  if (!found) {
    // Then try exact match without URL length restriction
    found = searchResults.find((c) => c.name.toLowerCase() === normalizedQuery);
  }
  
  if (!found) {
    // Try substring match, prefer 3-part URLs
    found = searchResults.find((c) => {
      const urlParts = c.url.split("/").filter(Boolean).length;
      return c.name.toLowerCase().includes(normalizedQuery) && urlParts === 3;
    });
  }
  
  if (!found) {
    // Then substring match without URL restriction
    found = searchResults.find((c) => c.name.toLowerCase().includes(normalizedQuery));
  }
  
  if (!found) {
    // Try reverse: check if query is included in city name, prefer 3-part URLs
    found = searchResults.find((c) => {
      const urlParts = c.url.split("/").filter(Boolean).length;
      return normalizedQuery.includes(c.name.toLowerCase()) && urlParts === 3;
    });
  }
  
  if (!found) {
    // Try reverse without URL restriction
    found = searchResults.find((c) => normalizedQuery.includes(c.name.toLowerCase()));
  }
  
  if (!found) {
    // Try removing common suffixes, prefer 3-part URLs
    const queryNoSuffix = normalizedQuery.replace(/\s+(city|town)$/, "");
    found = searchResults.find((c) => {
      const cityLower = c.name.toLowerCase();
      const urlParts = c.url.split("/").filter(Boolean).length;
      return (cityLower === queryNoSuffix || cityLower.includes(queryNoSuffix)) && urlParts === 3;
    });
  }
  
  if (!found) {
    // Try without URL restriction
    const queryNoSuffix = normalizedQuery.replace(/\s+(city|town)$/, "");
    found = searchResults.find((c) => {
      const cityLower = c.name.toLowerCase();
      return cityLower === queryNoSuffix || cityLower.includes(queryNoSuffix);
    });
  }
  
  if (!found) {
    // Just use the first result (already sorted: 3-part URLs first, then by followersCount)
    found = searchResults[0];
  }

  if (!found) {
    return null;
  }

  // Convert to IQAirCityRanking format
  const fullUrl = found.url.startsWith("http") 
    ? found.url 
    : `https://www.iqair.com/us${found.url}`;

  return {
    rank: 0, // Not available from search
    city: found.name,
    countrySlug: found.country.toLowerCase().replace(/\s+/g, "-"),
    aqi: found.aqi,
    url: fullUrl,
  };
}

/**
 * Get detailed data for a city:
 * - level (Unhealthy, etc.)
 * - main pollutant + its value (e.g., "PM2.5" and "80 µg/m³")
 * - list of all pollutants from the "Air pollutants" block
 */
export async function fetchIQAirCityDetailsByName(
  cityName: string,
): Promise<IQAirCityDetails | null> {
  const baseInfo = await fetchIQAirCityByName(cityName);
  if (!baseInfo) {
    return null;
  }

  const response = await fetch(baseInfo.url);
  if (!response.ok) {
    throw new Error(`IQAir city HTML fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Main AQI box
  const aqiCard = $('div')
    .filter((_, el) => {
      const cls = $(el).attr("class") ?? "";
      return cls.includes("aqi-box-shadow") || cls.includes("aqi-bg-");
    })
    .first();

  if (!aqiCard || aqiCard.length === 0) {
    throw new Error("IQAir HTML structure: AQI main card not found");
  }

  // Extract AQI from the card - look for the AQI number
  let aqi = baseInfo.aqi || 0;
  
  // Strategy 1: Look for number in div with AQI label
  const aqiLabelDiv = aqiCard.find("div").filter((_, el) => {
    const text = $(el).text();
    return text.includes("AQI") || text.includes("US AQI");
  }).first();
  
  if (aqiLabelDiv.length > 0) {
    // Look for number near AQI label
    const aqiText = aqiLabelDiv.find("p").filter((_, el) => {
      const text = $(el).text().trim();
      const num = Number.parseInt(text, 10);
      return !Number.isNaN(num) && num > 0 && num <= 500;
    }).first().text().trim();
    
    if (aqiText) {
      const parsedAqi = Number.parseInt(aqiText, 10);
      if (!Number.isNaN(parsedAqi)) {
        aqi = parsedAqi;
      }
    }
  }
  
  // Strategy 2: Look for any number in the card that could be AQI
  if (!aqi || aqi === 0) {
    const allNumbers = aqiCard.find("p").map((_, el) => {
      const text = $(el).text().trim();
      const num = Number.parseInt(text, 10);
      if (!Number.isNaN(num) && num > 0 && num <= 500) {
        return num;
      }
      return null;
    }).get().filter((n): n is number => n !== null);
    
    if (allNumbers.length > 0) {
      // Take the largest number that's in AQI range (usually the AQI)
      aqi = Math.max(...allNumbers);
    }
  }
  
  // Strategy 3: Try regex on card text
  if (!aqi || aqi === 0) {
    const cardText = aqiCard.text();
    const aqiMatch = cardText.match(/(?:AQI|US AQI)[\s:]*(\d{1,3})/i);
    if (aqiMatch) {
      const parsedAqi = Number.parseInt(aqiMatch[1], 10);
      if (!Number.isNaN(parsedAqi)) {
        aqi = parsedAqi;
      }
    }
  }

  // Level (Good / Unhealthy / ...) - try multiple selectors
  let level = aqiCard.find("p.font-body-l-medium").first().text().trim() || "";
  
  // If not found, try other common selectors
  if (!level) {
    level = aqiCard.find("p").filter((_, el) => {
      const text = $(el).text().trim();
      const levelLower = text.toLowerCase();
      return levelLower.includes("good") || 
             levelLower.includes("moderate") || 
             levelLower.includes("unhealthy") || 
             levelLower.includes("hazardous") ||
             levelLower.includes("sensitive");
    }).first().text().trim() || "";
  }

  // Main pollutant and its value: block with "Main pollutant:"
  // Try multiple strategies to find the main pollutant
  let mainName = "";
  let mainValue = 0;
  let mainUnit = "µg/m³";

  // Strategy 1: Look for div with font-body-m-medium that contains "Main pollutant"
  let mainRow = aqiCard
    .find("div.font-body-m-medium")
    .filter((_, el) => $(el).text().includes("Main pollutant"))
    .first();

  if (mainRow && mainRow.length > 0) {
    const mainTexts = mainRow.find("p");
    
    // Try different structures:
    // Structure A (Tehran style): nested div with p[0] = "Main pollutant:", p[1] = "PM2.5", and separate p with value
    // Structure B: p[0] = "Main pollutant:", p[1] = "PM2.5", p[2] = "80 µg/m³"
    
    // Find the pollutant name (usually the second p or the one after "Main pollutant:")
    const pollutantNameP = mainTexts.filter((i, p) => {
      const text = $(p).text().trim();
      return Boolean(text && 
             !text.toLowerCase().includes("main pollutant") && 
             !text.match(/^\d+\.?\d*\s*(µg|mg)/i) &&
             text.length < 20); // Pollutant names are usually short
    }).first();
    
    if (pollutantNameP.length > 0) {
      mainName = $(pollutantNameP).text().trim();
    }

    // Find the value (usually the last p or one with numbers and units)
    const valueP = mainTexts.filter((i, p) => {
      const text = $(p).text().trim();
      return Boolean(text && text.match(/^\d+\.?\d*\s*(µg|mg)/i));
    }).first();

    if (valueP.length > 0) {
      const mainValueText = $(valueP).text().trim();
      const [mainValueNumberPart, ...mainUnitParts] = mainValueText.split(/\s+/);
      mainValue = Number.parseFloat(mainValueNumberPart.replace(",", "."));
      mainUnit = mainUnitParts.join(" ") || "µg/m³";
    } else {
      // Try to find value as separate text node or in the same row
      const valueText = mainRow.text();
      const valueMatch = valueText.match(/(\d+\.?\d*)\s*(µg\/m³|µg|mg\/m³)/i);
      if (valueMatch) {
        mainValue = Number.parseFloat(valueMatch[1].replace(",", "."));
        mainUnit = valueMatch[2] || "µg/m³";
      }
    }
  }

  // Strategy 2: If not found, try searching in the entire aqiCard
  if (!mainName || !mainValue) {
    const allText = aqiCard.text();
    if (allText.includes("Main pollutant")) {
      // Try to find it by looking for text patterns
      const mainPollutantMatch = allText.match(/Main pollutant[:\s]+([A-Z0-9.]+)/i);
      if (mainPollutantMatch) {
        mainName = mainPollutantMatch[1];
      }

      // Try to find value near "Main pollutant"
      const valueMatch = allText.match(/Main pollutant[^]*?(\d+\.?\d*)\s*(µg\/m³|µg|mg\/m³)/i);
      if (valueMatch) {
        mainValue = Number.parseFloat(valueMatch[1].replace(",", "."));
        mainUnit = valueMatch[2] || "µg/m³";
      }
    }
  }

  const pollutants: IQAirPollutant[] = [];

  // Try multiple strategies to find pollutants table
  let pollutantsTable = $('table[title="Air pollutants"]');
  
  // If not found, try alternative selectors
  if (pollutantsTable.length === 0) {
    pollutantsTable = $('table').filter((_, el) => {
      const title = $(el).attr("title");
      return Boolean(title && title.toLowerCase().includes("pollutant"));
    });
  }

  if (pollutantsTable.length > 0) {
    pollutantsTable.find("tbody tr").each((_, tr) => {
      const btn = $(tr).find("button").first();
      if (!btn || btn.length === 0) return;

      // Structure: button > div > div > [text "PM2.5"] + div.text-gray-500 > [text "Fine particles..."]
      // Find div that contains nested div with description (text-gray-500)
      let nameDiv = btn.find("div").has("div.text-gray-500").first();
      
      // Alternative: try finding by text content
      if (!nameDiv || nameDiv.length === 0) {
        nameDiv = btn.find("div").filter((_, div) => {
          const text = $(div).text().trim();
          return Boolean(text && (text.includes("PM2.5") || text.includes("PM10") || text.includes("O3") || text.includes("NO2") || text.includes("SO2") || text.includes("CO")));
        }).first();
      }
      
      if (!nameDiv || nameDiv.length === 0) return;

      // Full description: text from nested div with class text-gray-500
      const descriptionDiv = nameDiv.find("div.text-gray-500").first();
      const description = descriptionDiv.length > 0 ? descriptionDiv.text().trim() : "";

      // Short name: all text from nameDiv minus description text
      const fullText = nameDiv.text().trim();
      // Remove description from full text to get only the short name
      let name = fullText.replace(description, "").trim();
      
      // If name is still too long, try to extract just the pollutant code
      if (name.length > 10) {
        const codeMatch = name.match(/(PM2\.5|PM10|O3|NO2|SO2|CO)/);
        if (codeMatch) {
          name = codeMatch[1];
        } else {
          // Take first word
          name = name.split(/\s+/)[0];
        }
      }

      // Try multiple ways to find value
      let value = 0;
      let unit = "µg/m³";
      
      // Strategy 1: Look for spans with font-body-m-medium
      const valueSpans = btn.find("span.font-body-m-medium");
      if (valueSpans.length >= 2) {
        const valueText = valueSpans.eq(0).text().trim();
        const unitText = valueSpans.eq(1).text().trim();
        value = Number.parseFloat(valueText.replace(",", "."));
        unit = unitText || "µg/m³";
      } else {
        // Strategy 2: Look for value in button text
        const buttonText = btn.text();
        const valueMatch = buttonText.match(/(\d+\.?\d*)\s*(µg\/m³|µg|mg\/m³|ppm|ppb)/i);
        if (valueMatch) {
          value = Number.parseFloat(valueMatch[1].replace(",", "."));
          unit = valueMatch[2] || "µg/m³";
        } else {
          // Strategy 3: Look for any number with unit in the row
          const rowText = $(tr).text();
          const rowValueMatch = rowText.match(/(\d+\.?\d*)\s*(µg\/m³|µg|mg\/m³|ppm|ppb)/i);
          if (rowValueMatch) {
            value = Number.parseFloat(rowValueMatch[1].replace(",", "."));
            unit = rowValueMatch[2] || "µg/m³";
          }
        }
      }

      if (!name || Number.isNaN(value) || value === 0) {
        return;
      }

      pollutants.push({
        name,
        description,
        value,
        unit,
      });
    });
  }

  // If main pollutant not found, use the first pollutant from the table (usually PM2.5)
  if (!mainName || !mainValue) {
    if (pollutants.length > 0) {
      const firstPollutant = pollutants[0];
      mainName = mainName || firstPollutant.name;
      mainValue = mainValue || firstPollutant.value;
      mainUnit = mainUnit || firstPollutant.unit;
    } else {
      // Fallback values if nothing found
      mainName = mainName || "PM2.5";
      mainValue = mainValue || 0;
      mainUnit = mainUnit || "µg/m³";
    }
  }

  return {
    ...baseInfo,
    aqi, // Use parsed AQI instead of baseInfo.aqi
    level,
    mainPollutant: {
      name: mainName,
      value: mainValue,
      unit: mainUnit,
    },
    pollutants,
  };
}




