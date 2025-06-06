import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Detail,
  getPreferenceValues,
  useNavigation,
  Icon,
  LocalStorage,
  LaunchProps,
  environment,
  Form,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { execSync } from "child_process";
import { detectAndParseAddress, geocodeLocation, isLocationBasedQuery, enhanceQueryWithLocation } from "./places-api";
// import { PromptBuilder } from "./prompt-builder";
import { PromptManager, QueryContext, QueryType } from "./prompt-manager";
import { Source, UserLocation, AddressComponents, SearchIntent, Preferences, ConversationContext } from "./types";

// Google Search API types
interface GoogleSearchResponse {
  readonly items?: Array<{
    readonly title: string;
    readonly link: string;
    readonly snippet: string;
    readonly displayLink?: string;
  }>;
  readonly error?: {
    readonly code: number;
    readonly message: string;
  };
}

// Unused interface - commented out
// interface AIOverviewSection {
//   title?: string;
//   content: string;
//   citations: number[];
// }

// Test queries for development
const SHOW_TEST_QUERIES = false; // Default toggle state
const TEST_QUERIES = [
  "How bad can gum disease get",
  "Best laptop for programming 2024",
  "Apple Store", // Will use location
  "Tesla dealership", // Will use location
  "Italian restaurant", // Will use location
  "What is quantum computing",
  "How to make sourdough bread",
  "emergency dentist near me", // Explicit location
];

// Location detection utilities
const LOCATION_CACHE_KEY = "user-location-cache";
const LOCATION_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedLocation(): Promise<UserLocation | null> {
  try {
    const cached = await LocalStorage.getItem<string>(LOCATION_CACHE_KEY);
    if (cached) {
      const location = JSON.parse(cached) as UserLocation;
      // Check if cache is still valid (24 hours)
      if (Date.now() - location.timestamp < LOCATION_CACHE_DURATION) {
        return location;
      }
    }
  } catch (error) {
    console.log("Failed to get cached location:", error);
  }
  return null;
}

async function setCachedLocation(location: UserLocation): Promise<void> {
  try {
    await LocalStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch (error) {
    console.log("Failed to cache location:", error);
  }
}

// Try to get location via macOS CoreLocationCLI (if installed)
async function getMacOSLocation(): Promise<UserLocation | null> {
  try {
    // Check if CoreLocationCLI is installed
    try {
      execSync("which CoreLocationCLI", { stdio: "ignore" });
    } catch {
      // CoreLocationCLI not installed, skip to IP location
      return null;
    }

    // Get current location
    const output = execSync("CoreLocationCLI -once -format '%latitude,%longitude'", {
      encoding: "utf8",
      timeout: 5000,
    }).trim();

    const [lat, lon] = output.split(",").map(Number);
    if (lat && lon) {
      // Reverse geocode to get city/region
      const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const response = await fetch(geocodeUrl, {
        headers: { "User-Agent": "Raycast-GoogleAI-Extension" },
      });

      if (response.ok) {
        const data = (await response.json()) as {
          address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
        };
        return {
          latitude: lat,
          longitude: lon,
          city: data.address?.city || data.address?.town || data.address?.village,
          region: data.address?.state,
          country: data.address?.country,
          timestamp: Date.now(),
        };
      }
    }
  } catch (error) {
    // CoreLocationCLI not available or failed
    console.log("CoreLocationCLI error:", error);
  }
  return null;
}

// Fallback to IP-based geolocation
async function getIPLocation(): Promise<UserLocation | null> {
  // Try multiple IP geolocation services in order
  const services = [
    {
      name: "ipapi.co",
      url: "https://ipapi.co/json/",
      parser: (data: Record<string, unknown>) => ({
        city: data.city,
        region: data.region,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude,
      }),
    },
    {
      name: "ip-api.com",
      url: "http://ip-api.com/json/",
      parser: (data: Record<string, unknown>) => ({
        city: data.city,
        region: data.regionName,
        country: data.country,
        latitude: data.lat,
        longitude: data.lon,
      }),
    },
    {
      name: "geolocation-db.com",
      url: "https://geolocation-db.com/json/",
      parser: (data: Record<string, unknown>) => ({
        city: data.city,
        region: data.state,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude,
      }),
    },
  ];

  for (const service of services) {
    try {
      console.log(`Trying IP location service: ${service.name}...`);
      const response = await fetch(service.url, {
        headers: {
          "User-Agent": "Raycast-GoogleAI-Extension",
          Accept: "application/json",
        },
      });

      console.log(`${service.name} response status: ${response.status}`);

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        console.log(`${service.name} data received:`, data);

        const parsed = service.parser(data);
        if (parsed.city && parsed.region) {
          return {
            ...parsed,
            timestamp: Date.now(),
          } as UserLocation;
        } else {
          console.log(`${service.name} data incomplete:`, parsed);
        }
      } else {
        const errorText = await response.text();
        console.log(`${service.name} error ${response.status}:`, errorText);
      }
    } catch (error) {
      console.log(`${service.name} failed:`, error);
    }
  }

  console.log("All IP geolocation services failed");
  return null;
}

// Get user location with caching
async function getUserLocation(): Promise<UserLocation | null> {
  console.log("Getting user location...");

  // First check cache
  const cached = await getCachedLocation();
  if (cached) {
    console.log("Using cached location:", cached);
    return cached;
  }

  // Try macOS location first (more accurate)
  console.log("Trying macOS location...");
  const macLocation = await getMacOSLocation();
  if (macLocation) {
    console.log("Got macOS location:", macLocation);
    await setCachedLocation(macLocation);
    return macLocation;
  }

  // Fallback to IP location
  console.log("Falling back to IP location...");
  const ipLocation = await getIPLocation();
  if (ipLocation) {
    console.log("Got IP location:", ipLocation);
    await setCachedLocation(ipLocation);
    return ipLocation;
  }

  console.log("Failed to get any location");
  return null;
}

// Check if query is likely a street address
function isAddress(query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  // Must start with a number (house/building number)
  if (!/^\d+/.test(normalizedQuery)) {
    return false;
  }

  // Common street types and their abbreviations
  const streetTypes = [
    "street",
    "st",
    "avenue",
    "ave",
    "road",
    "rd",
    "boulevard",
    "blvd",
    "drive",
    "dr",
    "lane",
    "ln",
    "way",
    "court",
    "ct",
    "place",
    "pl",
    "circle",
    "cir",
    "highway",
    "hwy",
    "parkway",
    "pkwy",
    "plaza",
    "plz",
    "terrace",
    "ter",
    "trail",
    "trl",
    "pike",
    "square",
    "sq",
    "loop",
    "crescent",
    "cres",
    "alley",
    "aly",
    "freeway",
    "fwy",
    "route",
    "rte",
  ];

  // Common directional indicators
  const directions = [
    "north",
    "south",
    "east",
    "west",
    "n",
    "s",
    "e",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
    "northeast",
    "northwest",
    "southeast",
    "southwest",
  ];

  // Build regex pattern for street types
  const streetTypePattern = streetTypes.join("|");
  const directionPattern = directions.join("|");

  // Address patterns (ordered by specificity)
  const addressPatterns = [
    // Full address with city/state/zip (e.g., "123 Main St, Boston, MA 02101")
    new RegExp(`^\\d+\\s+.+\\s+(${streetTypePattern})\\b.*,\\s*[a-z\\s]+,?\\s*([a-z]{2}\\s+)?\\d{5}(-\\d{4})?$`, "i"),

    // Address with city/state (e.g., "123 Main St, Boston, MA")
    new RegExp(`^\\d+\\s+.+\\s+(${streetTypePattern})\\b.*,\\s*[a-z\\s]+,?\\s*[a-z]{2}$`, "i"),

    // Address with city (e.g., "123 Main St, Boston")
    new RegExp(`^\\d+\\s+.+\\s+(${streetTypePattern})\\b.*,\\s*[a-z\\s]+$`, "i"),

    // Numbered street with direction (e.g., "123 5th Ave N", "456 10th Street East")
    new RegExp(`^\\d+\\s+\\d+\\w*\\s+(${streetTypePattern})\\s+(${directionPattern})$`, "i"),

    // Basic numbered street (e.g., "123 5th Avenue", "456 42nd Street")
    new RegExp(`^\\d+\\s+\\d+\\w*\\s+(${streetTypePattern})$`, "i"),

    // Street with direction (e.g., "123 Main St N", "456 Broadway Ave South")
    new RegExp(`^\\d+\\s+[a-z\\s]+\\s+(${streetTypePattern})\\s+(${directionPattern})$`, "i"),

    // Basic street address (e.g., "123 Main Street", "456 Oak Ave")
    new RegExp(`^\\d+\\s+[a-z\\s]+\\s+(${streetTypePattern})$`, "i"),

    // Address with apartment/suite (e.g., "123 Main St Apt 4", "456 Oak Ave Suite 200")
    new RegExp(`^\\d+\\s+.+\\s+(${streetTypePattern})\\b.*(apt|apartment|suite|ste|unit|#)\\s*\\w+$`, "i"),
  ];

  // Check if query matches any address pattern
  return addressPatterns.some((pattern) => pattern.test(normalizedQuery));
}

// Check if query is for a location/business
// Unused function - commented out for now
/*
function isLocationQuery(query: string): boolean {
  // First check if it's a pure address
  if (isAddress(query)) {
    return true;
  }

  const locationPatterns = [
    // Explicit location searches
    /\bnear me\b/i,
    /\bnearby\b/i,
    /\baround here\b/i,
    /\bclosest\b/i,
    /\bnearest\b/i,

    // Business types that are typically location-based
    /\b(restaurant|cafe|coffee|bar|pub|hotel|motel|store|shop|mall|dealership|clinic|hospital|pharmacy|bank|atm|gas station|gym|salon|spa|theater|cinema|museum|park)\b/i,

    // ZIP code standalone
    /\b\d{5}(-\d{4})?\b/,

    // Business names with location intent
    /\b(Apple Store|Tesla|Starbucks|McDonald's|Walmart|Target|Home Depot|Best Buy)\b/i,
  ];

  return locationPatterns.some((pattern) => pattern.test(query));
}
*/

// Check if query already contains location
function hasExplicitLocation(query: string): boolean {
  return (
    /\b(in|at|near)\s+[A-Z][a-z]+/i.test(query) || // "in Boston", "near Seattle"
    /,\s*[A-Z]{2}\b/.test(query) || // State abbreviation
    /,\s*[A-Z][a-z]+/.test(query)
  ); // City with comma
}

// Check if query is asking for weather
function isWeatherQuery(query: string): boolean {
  return /\bweather\b/i.test(query) || /\b(temperature|forecast|rain|snow|sunny|cloudy)\b/i.test(query);
}

// Extract location from weather query
function extractLocationFromWeatherQuery(query: string): string | null {
  // Patterns like "Agoura Hills weather" or "weather in Agoura Hills"
  const patterns = [
    /^(.+?)\s+weather$/i, // "Agoura Hills weather"
    /^weather\s+(?:in|for|at)\s+(.+)$/i, // "weather in Agoura Hills"
    /^(.+?)\s+(?:temperature|forecast)$/i, // "Agoura Hills temperature"
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // If query contains weather but no clear pattern, remove weather keyword
  if (/\bweather\b/i.test(query)) {
    return query.replace(/\bweather\b/i, "").trim();
  }

  return null;
}

// Extract weather data from search sources
// Unused function - commented out for now
/*
function extractWeatherFromSources(sources: Source[]): unknown | null {
  // Look for weather data in search snippets
  const weatherInfo: Record<string, unknown> = {
    temperature: null,
    condition: null,
    high: null,
    low: null,
    humidity: null,
    wind: null,
    forecast: [],
  };

  for (const source of sources) {
    const snippet = source.snippet?.toLowerCase() || "";
    const title = source.title?.toLowerCase() || "";
    const combined = `${title} ${snippet}`;

    // Temperature patterns
    const tempMatch = combined.match(/(\d{1,3})°?\s*(?:degrees?\s*)?(?:f|fahrenheit)/i);
    if (tempMatch && !weatherInfo.temperature) {
      weatherInfo.temperature = tempMatch[1];
    }

    // Current condition
    const conditionPatterns = [
      /currently:?\s*([a-z\s]+?)(?:\.|,|;|$)/i,
      /conditions?:?\s*([a-z\s]+?)(?:\.|,|;|$)/i,
      /(sunny|cloudy|partly cloudy|overcast|rain|rainy|snow|clear|fog|foggy|windy)/i,
    ];

    for (const pattern of conditionPatterns) {
      const match = combined.match(pattern);
      if (match && !weatherInfo.condition) {
        weatherInfo.condition = match[1].trim();
        break;
      }
    }

    // High/Low
    const highLowMatch = combined.match(/high:?\s*(\d{1,3})°?.*?low:?\s*(\d{1,3})°?/i);
    if (highLowMatch) {
      weatherInfo.high = highLowMatch[1];
      weatherInfo.low = highLowMatch[2];
    }

    // Humidity
    const humidityMatch = combined.match(/humidity:?\s*(\d{1,3})%/i);
    if (humidityMatch) {
      weatherInfo.humidity = humidityMatch[1];
    }

    // Wind
    const windMatch = combined.match(/wind:?\s*(\d{1,2})\s*mph/i);
    if (windMatch) {
      weatherInfo.wind = windMatch[1] + " mph";
    }
  }

  // Only return if we found at least temperature or condition
  if (weatherInfo.temperature || weatherInfo.condition) {
    return weatherInfo;
  }

  return null;
}
*/

// Parse address components from a query
function parseAddressComponents(
  query: string,
): { street?: string; city?: string; state?: string; zip?: string } | null {
  const normalized = query.trim();

  // Pattern for full address with city, state, zip
  const fullAddressMatch = normalized.match(/^(\d+\s+[^,]+?)\s*,\s*([^,]+?)\s*,\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
  if (fullAddressMatch) {
    return {
      street: fullAddressMatch[1].trim(),
      city: fullAddressMatch[2].trim(),
      state: fullAddressMatch[3].toUpperCase(),
      zip: fullAddressMatch[4],
    };
  }

  // Pattern for address with city and state
  const cityStateMatch = normalized.match(/^(\d+\s+[^,]+?)\s*,\s*([^,]+?)\s*,\s*([A-Z]{2})$/i);
  if (cityStateMatch) {
    return {
      street: cityStateMatch[1].trim(),
      city: cityStateMatch[2].trim(),
      state: cityStateMatch[3].toUpperCase(),
    };
  }

  // Pattern for address with just city
  const cityMatch = normalized.match(/^(\d+\s+[^,]+?)\s*,\s*([^,]+?)$/i);
  if (cityMatch) {
    return {
      street: cityMatch[1].trim(),
      city: cityMatch[2].trim(),
    };
  }

  return null;
}

// Follow-up question form component
function FollowUpForm({
  conversationContext,
  model,
  preferences,
  userLocation,
}: {
  conversationContext: ConversationContext;
  model: GenerativeModel;
  preferences: Preferences;
  userLocation: UserLocation | null;
}) {
  const navigation = useNavigation();
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { followUpQuestion: string }) => {
    const question = values.followUpQuestion?.trim();

    if (!question) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a follow-up question",
      });
      return;
    }

    setIsSubmitting(true);

    // Navigate to new AIOverviewView with conversation context
    navigation.push(
      <AIOverviewView
        query={question}
        model={model}
        preferences={preferences}
        userLocation={userLocation}
        conversationContext={conversationContext}
      />,
    );
  };

  return (
    <Form
      navigationTitle="Ask Follow-up Question"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Question" onSubmit={handleSubmit} icon={Icon.MagnifyingGlass} />
          <Action title="Cancel" onAction={() => navigation.pop()} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      <Form.Description title="Previous Question" text={conversationContext.originalQuery} />
      <Form.TextArea
        id="followUpQuestion"
        title="Follow-up Question"
        placeholder="Ask a follow-up question..."
        value={followUpQuestion}
        onChange={setFollowUpQuestion}
        autoFocus
      />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: { fallbackText?: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments?.fallbackText || "");
  const [isLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showTestQueries, setShowTestQueries] = useState(SHOW_TEST_QUERIES);
  const navigation = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const hasExecutedFallback = useRef(false);

  // Save to history
  const saveToHistory = useCallback(
    async (query: string) => {
      const newHistory = [query, ...searchHistory.filter((item) => item !== query)].slice(0, 20);
      setSearchHistory(newHistory);
      await LocalStorage.setItem("search-history", JSON.stringify(newHistory));
    },
    [searchHistory],
  );

  // Execute search
  const executeSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      if (!preferences.googleCloudApiKey) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Missing",
          message: "Please configure your Google Cloud API key in preferences",
        });
        return;
      }

      await saveToHistory(query);

      // Check if query is an address using Places API
      // This was removed since addressComponents is now determined inside AIOverviewView
      /*
      let addressComponents: AddressComponents | undefined;
      if (preferences.googleMapsPlatformApiKey) {
        const detectedAddress = await detectAndParseAddress(
          query,
          userLocation
            ? {
                latitude: userLocation.latitude || 0,
                longitude: userLocation.longitude || 0,
              }
            : undefined,
        );

        if (detectedAddress) {
          addressComponents = detectedAddress;
        }
      } else if (isAddress(query)) {
        // Fallback to regex-based detection when Places API is not available
        addressComponents = parseAddressComponents(query);
      }
      */

      const genAI = new GoogleGenerativeAI(preferences.googleCloudApiKey);
      const model = genAI.getGenerativeModel({
        model: preferences.model || "gemini-2.0-flash-exp",
      });

      navigation.push(
        <AIOverviewView query={query} model={model} preferences={preferences} userLocation={userLocation} />,
      );
    },
    [preferences, userLocation, saveToHistory, navigation],
  );

  // Get user location on mount
  useEffect(() => {
    getUserLocation().then((location) => {
      if (location) {
        setUserLocation(location);
      }
    });
  }, []);

  // Auto-execute search if fallbackText is provided (tab-to-search)
  useEffect(() => {
    if (props.arguments?.fallbackText && preferences.googleCloudApiKey && !hasExecutedFallback.current) {
      hasExecutedFallback.current = true;
      // Small delay to ensure location is loaded
      setTimeout(() => {
        executeSearch(props.arguments.fallbackText!);
      }, 100);
    }
  }, [props.arguments?.fallbackText, preferences.googleCloudApiKey, executeSearch]);

  // Load search history
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await LocalStorage.getItem<string>("search-history");
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      } catch (error) {
        console.log("Failed to load search history:", error);
      }
    }
    loadHistory();
  }, []);

  // Generate smart suggestions based on query
  const generateSuggestions = (text: string): string[] => {
    if (!text || text.length < 2) return [];

    const suggestions: string[] = [];
    const lowerText = text.toLowerCase();

    // Location-based suggestions
    if (userLocation && isLocationBasedQuery(text) && !hasExplicitLocation(text)) {
      suggestions.push(`${text} near me`);
      suggestions.push(`${text} in ${userLocation.city}`);
    }

    // Question completions
    if (lowerText.startsWith("what")) {
      suggestions.push(`${text} mean`);
      suggestions.push(`${text} do`);
    } else if (lowerText.startsWith("how")) {
      suggestions.push(`${text} work`);
      suggestions.push(`${text} to`);
    } else if (lowerText.startsWith("why")) {
      suggestions.push(`${text} important`);
    }

    // Add relevant history matches
    const historyMatches = searchHistory.filter((h) => h.toLowerCase().includes(lowerText) && h !== text).slice(0, 2);
    suggestions.push(...historyMatches);

    return suggestions.slice(0, 5);
  };

  // Debounced search for as-you-type experience
  const debouncedSearch = useDebouncedCallback((text: string) => {
    setSuggestions(generateSuggestions(text));
  }, 300);

  return (
    <List
      navigationTitle={searchText || "Google AI Overview"}
      searchText={searchText}
      onSearchTextChange={(text) => {
        setSearchText(text);
        debouncedSearch(text);
      }}
      searchBarPlaceholder="Ask anything..."
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {searchText && (
            <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => executeSearch(searchText)} />
          )}
          {environment.isDevelopment && (
            <Action
              title={showTestQueries ? "Hide Test Queries" : "Show Test Queries"}
              icon={Icon.Eye}
              onAction={() => setShowTestQueries(!showTestQueries)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          )}
        </ActionPanel>
      }
    >
      {searchText ? (
        <>
          <List.Section title="Search">
            <List.Item
              title={`Search for "${searchText}"`}
              subtitle={
                userLocation && isLocationBasedQuery(searchText) && !hasExplicitLocation(searchText)
                  ? `📍 Will use ${userLocation.city}`
                  : undefined
              }
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action title="Search" onAction={() => executeSearch(searchText)} />
                  {environment.isDevelopment && (
                    <Action
                      title={showTestQueries ? "Hide Test Queries" : "Show Test Queries"}
                      icon={Icon.Eye}
                      onAction={() => setShowTestQueries(!showTestQueries)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          </List.Section>

          {suggestions.length > 0 && (
            <List.Section title="Suggestions">
              {suggestions.map((suggestion, index) => (
                <List.Item
                  key={index}
                  title={suggestion}
                  icon={Icon.LightBulb}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Search"
                        onAction={() => {
                          setSearchText(suggestion);
                          executeSearch(suggestion);
                        }}
                      />
                      {environment.isDevelopment && (
                        <Action
                          title={showTestQueries ? "Hide Test Queries" : "Show Test Queries"}
                          icon={Icon.Eye}
                          onAction={() => setShowTestQueries(!showTestQueries)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        <>
          {searchHistory.length > 0 && (
            <List.Section title="Recent Searches">
              {searchHistory.map((query, index) => (
                <List.Item
                  key={index}
                  title={query}
                  icon={Icon.Clock}
                  actions={
                    <ActionPanel>
                      <Action title="Search" onAction={() => executeSearch(query)} />
                      <Action
                        title="Remove from History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const newHistory = searchHistory.filter((_, i) => i !== index);
                          setSearchHistory(newHistory);
                          await LocalStorage.setItem("search-history", JSON.stringify(newHistory));
                        }}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                      />
                      <Action
                        title="Clear All History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          setSearchHistory([]);
                          await LocalStorage.removeItem("search-history");
                          await showToast({
                            style: Toast.Style.Success,
                            title: "History cleared",
                          });
                        }}
                        shortcut={{
                          modifiers: ["cmd", "opt", "shift"],
                          key: "x",
                        }}
                      />
                      {environment.isDevelopment && (
                        <Action
                          title={showTestQueries ? "Hide Test Queries" : "Show Test Queries"}
                          icon={Icon.Eye}
                          onAction={() => setShowTestQueries(!showTestQueries)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {environment.isDevelopment && showTestQueries && TEST_QUERIES.length > 0 && (
            <List.Section title="Test Queries">
              {TEST_QUERIES.map((query, index) => (
                <List.Item
                  key={index}
                  title={query}
                  icon={Icon.Bug}
                  actions={
                    <ActionPanel>
                      <Action title="Search" onAction={() => executeSearch(query)} />
                      {environment.isDevelopment && (
                        <Action
                          title={showTestQueries ? "Hide Test Queries" : "Show Test Queries"}
                          icon={Icon.Eye}
                          onAction={() => setShowTestQueries(!showTestQueries)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function AIOverviewView({
  query,
  model,
  preferences,
  userLocation,
  conversationContext,
}: {
  query: string;
  model: GenerativeModel;
  preferences: Preferences;
  userLocation: UserLocation | null;
  conversationContext?: ConversationContext;
}) {
  const navigation = useNavigation();
  const { pop } = navigation;
  const [status, setStatus] = useState<"searching" | "generating" | "done">("searching");
  const [overview, setOverview] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  // const [sections, setSections] = useState<AIOverviewSection[]>([]);
  const [locationUsed, setLocationUsed] = useState(false);
  const [searchIntent, setSearchIntent] = useState<{
    isAddress: boolean;
    isLocation: boolean;
    hasExplicitLocation: boolean;
    enhancedWithLocation: boolean;
    isWeather: boolean;
    weatherLocation?: string;
    addressComponents?: AddressComponents;
  }>({
    isAddress: false,
    isLocation: false,
    hasExplicitLocation: false,
    enhancedWithLocation: false,
    isWeather: false,
  });
  // const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<{
    current?: {
      temp_f?: number;
      feels_like_f?: number;
      condition?: string;
      wind_mph?: number;
      wind_dir?: string;
      humidity?: number;
      uv_index?: number;
    };
  } | null>(null);
  // const [addressData, setAddressData] = useState<unknown>(null);
  const [isLoadingWeatherData, setIsLoadingWeatherData] = useState(false);
  const [queryType, setQueryType] = useState<QueryType | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout | undefined;

    async function generateOverview() {
      let searchToast: Toast | undefined;

      // Set a timeout to prevent infinite waiting
      timeoutId = setTimeout(() => {
        if (!isCancelled && status !== "done") {
          console.error("Request timed out after 30 seconds");
          isCancelled = true;
          searchToast?.hide();
          setStatus("done");
          setError("Request timed out. Please try again.");
          showToast({
            style: Toast.Style.Failure,
            title: "Request Timeout",
            message: "The request took too long. Please try again.",
          });
        }
      }, 30000); // 30 second timeout

      try {
        // Step 1: Search for sources
        setStatus("searching");
        searchToast = await showToast({
          style: Toast.Style.Animated,
          title: "Searching for sources...",
        });

        // Enhance query with location if appropriate
        let searchQuery = query;
        let shouldUseLocation = false;

        // Detect search intent using Places API if available
        const placesApiComponents = preferences.googleMapsPlatformApiKey
          ? await detectAndParseAddress(
              query,
              userLocation
                ? {
                    latitude: userLocation.latitude || 0,
                    longitude: userLocation.longitude || 0,
                  }
                : undefined,
            )
          : null;

        // Check for weather query
        const weatherLocation = extractLocationFromWeatherQuery(query);
        const isWeatherIntent = isWeatherQuery(query);

        const intent: SearchIntent = {
          isAddress: placesApiComponents !== null || isAddress(query),
          isLocation: isLocationBasedQuery(query),
          hasExplicitLocation: hasExplicitLocation(query),
          enhancedWithLocation: false,
          isWeather: isWeatherIntent,
          weatherLocation: weatherLocation || undefined,
          addressComponents: placesApiComponents || parseAddressComponents(query) || undefined,
        };

        // Debug location detection
        console.log("Location check:", {
          hasUserLocation: !!userLocation,
          isLocationQuery: intent.isLocation,
          hasExplicitLocation: intent.hasExplicitLocation,
          isAddress: intent.isAddress,
          isWeather: intent.isWeather,
          weatherLocation: intent.weatherLocation,
          userLocation: userLocation,
        });

        if (userLocation && intent.isLocation && !intent.hasExplicitLocation) {
          const enhancedQuery = enhanceQueryWithLocation(query, userLocation);
          if (enhancedQuery !== query) {
            searchQuery = enhancedQuery;
            shouldUseLocation = true;
            intent.enhancedWithLocation = true;
            setLocationUsed(true);
            console.log("Enhanced query with location:", searchQuery);
          }
        }

        // If weather query, validate/geocode the location
        if (intent.isWeather && intent.weatherLocation) {
          // Try Places API geocoding first if available
          if (preferences.googleMapsPlatformApiKey) {
            const weatherPlaceComponents = await geocodeLocation(
              intent.weatherLocation,
              userLocation
                ? {
                    latitude: userLocation.latitude || 0,
                    longitude: userLocation.longitude || 0,
                  }
                : undefined,
            );

            if (weatherPlaceComponents) {
              intent.addressComponents = weatherPlaceComponents;
              console.log("Weather location geocoded with Places API:", weatherPlaceComponents);
            }
          }

          // If no Places API or it failed, try our regex-based detection
          if (!intent.addressComponents) {
            // Check if the weather location looks like an address
            if (isAddress(intent.weatherLocation)) {
              intent.addressComponents = parseAddressComponents(intent.weatherLocation) || undefined;
              console.log("Weather location parsed with regex:", intent.addressComponents);
            } else {
              // For simple city names, create basic address components
              intent.addressComponents = {
                city: intent.weatherLocation,
                formattedAddress: intent.weatherLocation,
              };
              console.log("Weather location as city:", intent.addressComponents);
            }
          }
        }

        setSearchIntent(intent);

        // Set loading state for weather queries
        if (intent.isWeather) {
          setIsLoadingWeatherData(true);
        }

        let realSources: Source[] = [];

        // Try to fetch real sources
        if (preferences.googleCloudApiKey && preferences.googleSearchEngineId) {
          try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${preferences.googleCloudApiKey}&cx=${preferences.googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=8`;
            const searchResponse = await fetch(searchUrl);

            if (searchResponse.ok) {
              const searchData = (await searchResponse.json()) as GoogleSearchResponse;

              if (searchData.items) {
                realSources = searchData.items.map((item) => ({
                  title: item.title,
                  url: item.link,
                  snippet: item.snippet,
                  displayUrl: item.displayLink || new URL(item.link).hostname,
                }));
              }
            }
          } catch {
            console.log("Search API failed, using fallback");
          }
        }

        // Fallback sources if needed
        if (realSources.length === 0) {
          realSources = [
            {
              title: "Search Results",
              url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
              snippet: "View full search results on Google",
              displayUrl: "google.com",
            },
          ];
        }

        setSources(realSources);

        // Don't extract weather data from sources anymore - wait for real API data
        // This prevents showing random/inaccurate data in the metadata panel

        // If this is an address and we have Maps API key, generate map
        if (intent.isAddress && preferences.googleMapsPlatformApiKey) {
          try {
            // Use the formatted address or original query for the map
            const mapAddress = intent.addressComponents?.formattedAddress || searchQuery;
            const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(mapAddress)}&zoom=16&size=600x400&markers=color:red%7C${encodeURIComponent(mapAddress)}&key=${preferences.googleMapsPlatformApiKey}`;
            setMapImageUrl(mapUrl);

            console.log("Map URL generated for address:", mapAddress);
          } catch (error) {
            console.log("Failed to generate map:", error);
          }
        }

        // Step 2: Generate AI overview
        setStatus("generating");
        searchToast.title = "Generating AI overview...";
        searchToast.show();

        // Check if this is a pure address query
        const isPureAddress = isAddress(query);

        // Debug model info
        console.log("Using model:", preferences.model || "gemini-2.0-flash-exp");
        console.log("Preferences model setting:", preferences.model);
        console.log("API Key present:", !!preferences.googleCloudApiKey);
        console.log("Search Engine ID:", preferences.googleSearchEngineId || "Not set");

        // Build prompt using PromptManager
        const promptManager = new PromptManager();
        const queryContext: QueryContext = {
          userLocation: shouldUseLocation && userLocation ? userLocation : undefined,
          sources: realSources,
          preferences: preferences,
          addressComponents: intent.addressComponents,
          searchHistory: [], // Could be populated from LocalStorage if needed
          conversationContext: conversationContext,
        };

        // Analyze query for debugging
        const queryAnalysis = await promptManager.analyzeQuery(query, queryContext);
        console.log("Query Analysis:", queryAnalysis);
        setQueryType(queryAnalysis.type);

        // For weather queries, make parallel requests
        if (intent.isWeather) {
          try {
            // Launch both requests in parallel
            const [textPromise, jsonPromise] = await Promise.all([
              // Text request - immediate display
              (async () => {
                // Override analysis type for text-only weather
                const textAnalysis = {
                  ...queryAnalysis,
                  type: QueryType.WEATHER_TEXT,
                };
                const textGenerator = promptManager.getGenerator(QueryType.WEATHER_TEXT);
                if (!textGenerator) throw new Error("Weather text generator not found");
                const textPrompt = textGenerator.generate(textAnalysis, queryContext);
                console.log("Weather TEXT prompt created");
                return model.generateContentStream(textPrompt);
              })(),
              // JSON request - background loading
              (async () => {
                // Override analysis type for JSON-only weather
                const jsonAnalysis = {
                  ...queryAnalysis,
                  type: QueryType.WEATHER_JSON,
                };
                const jsonGenerator = promptManager.getGenerator(QueryType.WEATHER_JSON);
                if (!jsonGenerator) throw new Error("Weather JSON generator not found");
                const jsonPrompt = jsonGenerator.generate(jsonAnalysis, queryContext);
                console.log("Weather JSON prompt created");
                return model.generateContentStream(jsonPrompt);
              })(),
            ]);

            // Process text stream immediately
            let fullText = "";
            let isFirstChunk = true;

            try {
              for await (const chunk of textPromise.stream) {
                if (isCancelled) break;

                if (isFirstChunk) {
                  searchToast.title = "Thinking...";
                  searchToast.show();
                  isFirstChunk = false;
                }

                const chunkText = chunk.text();
                fullText += chunkText;
                setOverview(fullText);
              }
            } catch (textStreamError) {
              console.error("Error streaming weather text:", textStreamError);
              throw textStreamError;
            }

            // Process JSON stream in background
            if (!isCancelled) {
              try {
                let jsonText = "";
                for await (const chunk of jsonPromise.stream) {
                  if (isCancelled) break;
                  jsonText += chunk.text();
                }

                // Parse JSON result
                try {
                  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsedJson = JSON.parse(jsonMatch[0]);
                    setWeatherData(parsedJson);
                    console.log("Parsed weather JSON from parallel request:", parsedJson);
                  }
                } catch (error) {
                  console.error("Failed to parse weather JSON from parallel request:", error);
                }
              } catch (jsonStreamError) {
                console.error("Error streaming weather JSON:", jsonStreamError);
                // Don't throw here - JSON is optional enhancement
              } finally {
                setIsLoadingWeatherData(false);
              }
            }

            if (!isCancelled) {
              setStatus("done");
              searchToast.hide();
            }

            // Skip the regular streaming logic below
            return;
          } catch (weatherError) {
            console.error("Weather request failed:", weatherError);
            setIsLoadingWeatherData(false);
            throw weatherError;
          }
        }

        // Non-weather queries use the regular flow
        const prompt = await promptManager.getPrompt(query, queryContext);

        // Debug: Log the prompt being sent to Gemini
        console.log("=== GEMINI PROMPT ===");
        console.log("Query type:", intent.isWeather ? "WEATHER" : isPureAddress ? "ADDRESS" : "GENERAL");
        console.log("Full prompt length:", prompt.length);

        // Split prompt to avoid truncation
        const promptLines = prompt.split("\n");
        console.log(`Prompt has ${promptLines.length} lines`);

        // Log in chunks to avoid truncation
        const instructionsIndex = prompt.indexOf("Instructions:");
        if (instructionsIndex > -1) {
          console.log("--- PROMPT HEADER ---");
          console.log(prompt.substring(0, instructionsIndex));
          console.log("--- INSTRUCTIONS ---");
          console.log(prompt.substring(instructionsIndex));
        } else {
          // Fallback if no Instructions section
          console.log(prompt);
        }

        console.log("=== END PROMPT ===");

        let result;
        try {
          result = await model.generateContentStream(prompt);
        } catch (modelError) {
          console.error("Model error details:", modelError);
          throw modelError;
        }

        let fullText = "";
        let isFirstChunk = true;
        let displayText = "";
        let hasSeenJsonDelimiter = false;

        try {
          for await (const chunk of result.stream) {
            if (isCancelled) break;

            if (isFirstChunk) {
              // Update toast when streaming starts
              searchToast.title = "Thinking...";
              searchToast.show();
              isFirstChunk = false;
            }

            const chunkText = chunk.text();
            fullText += chunkText;

            // Debug: Log Gemini's direct output
            if (chunkText) {
              console.log("Gemini chunk:", chunkText);
            }

            // For weather queries, only display text before the JSON delimiter
            if (intent.isWeather && !hasSeenJsonDelimiter) {
              const delimiterIndex = fullText.indexOf("---JSON-DATA---");
              if (delimiterIndex !== -1) {
                hasSeenJsonDelimiter = true;
                displayText = fullText.substring(0, delimiterIndex).trim();
              } else {
                displayText = fullText;
              }
              setOverview(displayText);
            } else if (!intent.isWeather) {
              // For non-weather queries, stream everything
              setOverview(fullText);
            }
          }
        } catch (streamError) {
          console.error("Error during streaming:", streamError);
          if (!isCancelled) {
            searchToast?.hide();
            setStatus("done");
            throw new Error(
              `Streaming failed: ${streamError instanceof Error ? streamError.message : "Unknown error"}`,
            );
          }
        }

        if (!isCancelled) {
          setStatus("done");
          // Hide the toast when done
          searchToast.hide();

          // Debug: Log complete Gemini response
          console.log("=== COMPLETE GEMINI RESPONSE ===");
          console.log(fullText);
          console.log("=== END GEMINI RESPONSE ===");

          // Parse JSON for weather queries
          if (intent.isWeather) {
            const delimiterIndex = fullText.indexOf("---JSON-DATA---");
            if (delimiterIndex !== -1) {
              const jsonText = fullText.substring(delimiterIndex + "---JSON-DATA---".length).trim();
              try {
                // Extract JSON object
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsedJson = JSON.parse(jsonMatch[0]);
                  setWeatherData(parsedJson);
                  setIsLoadingWeatherData(false);
                  console.log("Parsed weather JSON data:", parsedJson);
                } else {
                  console.error("No JSON found after delimiter");
                  setIsLoadingWeatherData(false);
                }
              } catch (error) {
                console.error("Failed to parse weather JSON:", error);
                console.log("JSON text that failed to parse:", jsonText);
                setIsLoadingWeatherData(false);
              }
            }
          }
        }
      } catch (error) {
        if (!isCancelled) {
          // Hide the animated toast before showing error
          searchToast?.hide();
          setError(error instanceof Error ? error.message : "Unknown error");
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to generate overview",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } finally {
        // Only set status to done if not already done
        if (!isCancelled && status !== "done") {
          setStatus("done");
        }
        // Clear timeout when done
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    generateOverview();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [query, model, preferences, userLocation]);

  if (error) {
    return (
      <Detail
        navigationTitle={query}
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={pop} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  // Format the overview with proper citations
  const formatOverviewWithLinks = (text: string) => {
    // Replace all citations [1], [2], [1, 2, 3], etc. with clickable links
    const formattedText = text.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, numbers) => {
      const citationNumbers = numbers.split(/,\s*/);
      const links = citationNumbers.map((num: string) => {
        const index = parseInt(num) - 1;
        if (index >= 0 && index < sources.length) {
          return `[[${num}]](${sources[index].url})`;
        }
        return `[${num}]`;
      });

      // If single citation, return as is. If multiple, join with commas
      if (citationNumbers.length === 1) {
        return links[0];
      } else {
        return "[" + links.join(", ") + "]";
      }
    });

    return formattedText;
  };

  // Display content with citation links
  const displayContent = () => {
    // Always return formatted overview with citation links
    // Weather data is now in the text summary, not JSON
    return formatOverviewWithLinks(overview);
  };

  const isCurrentlyLoading = status === "searching" || status === "generating";

  const locationNote =
    locationUsed && userLocation && status === "done" ? `  \n📍 ${userLocation.city}, ${userLocation.region}` : "";

  const queryDisplay = `## ${searchIntent.isWeather ? "🌤️ " : ""}\`"${query}"\`\n\n${locationNote}\n\n`;

  const content = displayContent();

  // If we have a map image, include it in the markdown
  let mapSection = "";
  if (mapImageUrl && searchIntent.isAddress) {
    mapSection = `![Map of ${query}](${mapImageUrl})\n\n`;
  }

  const markdown = `${queryDisplay}${mapSection}${content}`;

  return (
    <Detail
      navigationTitle={query}
      isLoading={isCurrentlyLoading}
      markdown={markdown}
      metadata={
        sources.length > 0 || environment.isDevelopment ? (
          <Detail.Metadata>
            {locationUsed && userLocation && (
              <>
                <Detail.Metadata.Label title="Location" text={`${userLocation.city}, ${userLocation.region}`} />
                <Detail.Metadata.Separator />
              </>
            )}
            {searchIntent.isWeather && (
              <>
                {isLoadingWeatherData ? (
                  // Show loading state
                  <>
                    <Detail.Metadata.Label title="🌤️ Weather Data" text="Loading..." />
                    <Detail.Metadata.Separator />
                  </>
                ) : weatherData && weatherData.current ? (
                  // Google Weather API data
                  <>
                    <Detail.Metadata.Label
                      title="🌡️ Temperature"
                      text={weatherData.current.temp_f ? `${Math.round(weatherData.current.temp_f)}°F` : "N/A"}
                    />
                    <Detail.Metadata.Label
                      title="🤔 Feels Like"
                      text={
                        weatherData.current.feels_like_f ? `${Math.round(weatherData.current.feels_like_f)}°F` : "N/A"
                      }
                    />
                    <Detail.Metadata.Label title="🌤️ Condition" text={weatherData.current.condition} />
                    <Detail.Metadata.Label
                      title="💨 Wind"
                      text={`${weatherData.current.wind_mph} mph ${weatherData.current.wind_dir}`}
                    />
                    <Detail.Metadata.Label title="💧 Humidity" text={`${weatherData.current.humidity}%`} />
                    {weatherData.current.uv_index !== undefined && (
                      <Detail.Metadata.Label title="☀️ UV Index" text={String(weatherData.current.uv_index)} />
                    )}
                    <Detail.Metadata.Separator />
                  </>
                ) : null}
              </>
            )}
            {sources.map((source, index) => (
              <Detail.Metadata.Link
                key={index}
                title={`[${index + 1}] ${source.title}`}
                text={source.displayUrl || ""}
                target={source.url}
              />
            ))}
            {environment.isDevelopment && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="🔍 Search Intent" text="Development Mode" />
                <Detail.Metadata.Label title="Is Address" text={searchIntent.isAddress ? "✓ Yes" : "✗ No"} />
                <Detail.Metadata.Label title="Is Location Query" text={searchIntent.isLocation ? "✓ Yes" : "✗ No"} />
                <Detail.Metadata.Label
                  title="Has Explicit Location"
                  text={searchIntent.hasExplicitLocation ? "✓ Yes" : "✗ No"}
                />
                <Detail.Metadata.Label
                  title="Enhanced with Location"
                  text={searchIntent.enhancedWithLocation ? "✓ Yes" : "✗ No"}
                />
                <Detail.Metadata.Label title="Is Weather Query" text={searchIntent.isWeather ? "✓ Yes" : "✗ No"} />
                {searchIntent.weatherLocation && (
                  <Detail.Metadata.Label title="Weather Location" text={searchIntent.weatherLocation} />
                )}
                {searchIntent.addressComponents && (
                  <>
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="📍 Parsed Address" text="Components" />
                    {searchIntent.addressComponents.streetNumber && (
                      <Detail.Metadata.Label title="Street Number" text={searchIntent.addressComponents.streetNumber} />
                    )}
                    {searchIntent.addressComponents.streetName && (
                      <Detail.Metadata.Label title="Street Name" text={searchIntent.addressComponents.streetName} />
                    )}
                    {searchIntent.addressComponents.city && (
                      <Detail.Metadata.Label title="City" text={searchIntent.addressComponents.city} />
                    )}
                    {searchIntent.addressComponents.state && (
                      <Detail.Metadata.Label title="State" text={searchIntent.addressComponents.state} />
                    )}
                    {searchIntent.addressComponents.postalCode && (
                      <Detail.Metadata.Label title="ZIP" text={searchIntent.addressComponents.postalCode} />
                    )}
                    {searchIntent.addressComponents.country && (
                      <Detail.Metadata.Label title="Country" text={searchIntent.addressComponents.country} />
                    )}
                  </>
                )}
              </>
            )}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Search on Google"
            url={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
            icon={Icon.Globe}
          />
          {searchIntent.isAddress && (
            <Action.OpenInBrowser
              title="Open in Google Maps"
              url={`https://www.google.com/maps/search/${encodeURIComponent(query)}`}
              icon={Icon.Map}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          )}
          <Action.CopyToClipboard
            content={overview}
            title="Copy Overview"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {queryType === QueryType.GENERAL && status === "done" && (
            <Action
              title="Ask Follow-Up Question"
              icon={Icon.QuestionMark}
              onAction={() => {
                const context: ConversationContext = {
                  originalQuery: query,
                  previousResponse: overview,
                  sources: sources,
                  searchIntent: searchIntent,
                  timestamp: Date.now(),
                };
                navigation.push(
                  <FollowUpForm
                    conversationContext={context}
                    model={model}
                    preferences={preferences}
                    userLocation={userLocation}
                  />,
                );
              }}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          <Action
            title="New Search"
            onAction={pop}
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <ActionPanel.Section title="Sources">
            {sources.map((source, index) => (
              <Action.OpenInBrowser
                key={index}
                title={source.title}
                url={source.url}
                shortcut={
                  index < 9 ? { modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent } : undefined
                }
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
