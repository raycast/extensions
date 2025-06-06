import { Source, UserLocation, AddressComponents, Preferences, ConversationContext } from "./types";

// Core interfaces
export interface QueryContext {
  userLocation?: UserLocation;
  searchHistory?: string[];
  sources?: Source[];
  preferences?: Preferences;
  addressComponents?: AddressComponents;
  conversationContext?: ConversationContext;
}

export enum QueryType {
  WEATHER = "weather",
  WEATHER_TEXT = "weather_text",
  WEATHER_JSON = "weather_json",
  ADDRESS = "address",
  LOCAL_BUSINESS = "local_business",
  GENERAL = "general",
}

export interface QueryAnalysis {
  type: QueryType;
  confidence: number;
  extractedData: {
    location?: string;
    businessName?: string;
    weatherLocation?: string;
    addressString?: string;
    [key: string]: unknown;
  };
  requiresLocation: boolean;
  hasExplicitLocation: boolean;
}

// Abstract base classes
export abstract class QueryAnalyzer {
  abstract analyze(query: string, context: QueryContext): Promise<QueryAnalysis>;

  protected normalizeQuery(query: string): string {
    return query.trim().toLowerCase();
  }
}

export abstract class PromptGenerator {
  abstract generate(analysis: QueryAnalysis, context: QueryContext): string;

  protected formatSources(sources: Source[]): string {
    if (!sources || sources.length === 0) return "";

    return sources
      .map((source, index) => `[${index + 1}] ${source.title} (${source.displayUrl})\n${source.snippet}`)
      .join("\n\n");
  }
}

// Main PromptManager class
export class PromptManager {
  private analyzers: QueryAnalyzer[] = [];
  private generators: Map<QueryType, PromptGenerator> = new Map();

  constructor() {
    this.initializeAnalyzers();
    this.initializeGenerators();
  }

  private initializeAnalyzers() {
    this.analyzers = [
      new WeatherAnalyzer(),
      new AddressAnalyzer(),
      new LocalBusinessAnalyzer(),
      // General analyzer should be last as fallback
      new GeneralAnalyzer(),
    ];
  }

  private initializeGenerators() {
    this.generators.set(QueryType.WEATHER, new WeatherPromptGenerator());
    this.generators.set(QueryType.WEATHER_TEXT, new WeatherTextPromptGenerator());
    this.generators.set(QueryType.WEATHER_JSON, new WeatherJsonPromptGenerator());
    this.generators.set(QueryType.ADDRESS, new AddressPromptGenerator());
    this.generators.set(QueryType.LOCAL_BUSINESS, new LocalBusinessPromptGenerator());
    this.generators.set(QueryType.GENERAL, new GeneralPromptGenerator());
  }

  // Public methods to extend the system
  registerAnalyzer(analyzer: QueryAnalyzer, priority: "high" | "normal" = "normal") {
    if (priority === "high") {
      this.analyzers.unshift(analyzer);
    } else {
      // Insert before the general analyzer
      this.analyzers.splice(this.analyzers.length - 1, 0, analyzer);
    }
  }

  registerGenerator(type: QueryType, generator: PromptGenerator) {
    this.generators.set(type, generator);
  }

  async getPrompt(query: string, context: QueryContext): Promise<string> {
    // Analyze query with all analyzers
    const analyses = await Promise.all(this.analyzers.map((analyzer) => analyzer.analyze(query, context)));

    // Select the analysis with highest confidence
    const bestAnalysis = analyses.reduce((best, current) => (current.confidence > best.confidence ? current : best));

    // Get appropriate generator
    const generator = this.generators.get(bestAnalysis.type);
    if (!generator) {
      throw new Error(`No generator found for query type: ${bestAnalysis.type}`);
    }

    // Generate and return prompt
    return generator.generate(bestAnalysis, context);
  }

  // Helper method to analyze without generating prompt
  async analyzeQuery(query: string, context: QueryContext): Promise<QueryAnalysis> {
    const analyses = await Promise.all(this.analyzers.map((analyzer) => analyzer.analyze(query, context)));

    return analyses.reduce((best, current) => (current.confidence > best.confidence ? current : best));
  }

  // Method to get a specific generator
  getGenerator(type: QueryType): PromptGenerator | undefined {
    return this.generators.get(type);
  }
}

// Weather Analyzer and Generator
class WeatherAnalyzer extends QueryAnalyzer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyze(query: string, _context: QueryContext): Promise<QueryAnalysis> {
    const normalized = this.normalizeQuery(query);
    const weatherKeywords = ["weather", "temperature", "forecast", "rain", "snow", "sunny", "cloudy"];

    // Check for weather keywords
    const hasWeatherKeyword = weatherKeywords.some((keyword) => normalized.includes(keyword));

    // Extract location from weather query
    let weatherLocation: string | undefined;
    const patterns = [/^(.+?)\s+weather$/i, /^weather\s+(?:in|for|at)\s+(.+)$/i, /^(.+?)\s+(?:temperature|forecast)$/i];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        weatherLocation = match[1].trim();
        break;
      }
    }

    // If no explicit location but has weather keyword, use current location
    if (hasWeatherKeyword && !weatherLocation) {
      weatherLocation = "current location";
    }

    const confidence = hasWeatherKeyword ? 0.9 : 0.0;

    return {
      type: QueryType.WEATHER,
      confidence,
      extractedData: {
        weatherLocation,
      },
      requiresLocation: true,
      hasExplicitLocation: !!weatherLocation && weatherLocation !== "current location",
    };
  }
}

class WeatherPromptGenerator extends PromptGenerator {
  generate(analysis: QueryAnalysis, context: QueryContext): string {
    const location = analysis.extractedData.weatherLocation || "the specified location";
    const addressComponents = context.addressComponents;

    let locationStr = location;
    if (addressComponents && addressComponents.latitude && addressComponents.longitude) {
      locationStr = `${addressComponents.city || location}, ${addressComponents.state || ""} (Lat: ${addressComponents.latitude}, Lon: ${addressComponents.longitude})`;
    }

    return `Get weather data for: ${locationStr}

Instructions:
- First, provide a human-readable weather summary using markdown
- Then, after the delimiter "---JSON-DATA---", provide detailed weather data in JSON format
- Use Google Weather API to get accurate, real-time data

PART 1 - Text Summary (before delimiter):
- Create a Google-style weather widget using markdown
- DO NOT mention JSON, data formats, or that you'll provide additional data
- Use the exact format shown below to mimic Google's weather display
- Only use fahrenheit
- Write as if this is the ONLY response the user will see

Use this exact format to create a Google-style weather widget:

# ☀️
## **[TEMP]°F**
### [City, State]
**[Condition] • [Day, Time]**

**Precipitation:** [X]% • **Humidity:** [X]% • **Wind:** [X] mph  

---

### 3-Day Outlook

| | Day | High/Low | Conditions |
|:--:|:----|:---------|:-----------|
| [emoji] | **[Day]** | **[high]°**/**[low]°** | [condition] |
| [emoji] | [Day] | [high]°/[low]° | [condition] |
| [emoji] | [Day] | [high]°/[low]° | [condition] |

Use appropriate weather emojis:
- ☀️ Clear/Sunny
- 🌤️ Mostly sunny
- ⛅ Partly cloudy
- ☁️ Cloudy
- 🌧️ Rain/Showers
- ⛈️ Thunderstorm
- ❄️ Snow
- 🌫️ Fog/Mist

PART 2 - JSON Data (after delimiter):
After the line "---JSON-DATA---", provide ONLY valid JSON with the weather data structure.`;
  }
}

class WeatherTextPromptGenerator extends PromptGenerator {
  generate(analysis: QueryAnalysis, context: QueryContext): string {
    const location = analysis.extractedData.weatherLocation || "the specified location";
    const addressComponents = context.addressComponents;

    let locationStr = location;
    if (addressComponents && addressComponents.latitude && addressComponents.longitude) {
      locationStr = `${addressComponents.city || location}, ${addressComponents.state || ""} (Lat: ${addressComponents.latitude}, Lon: ${addressComponents.longitude})`;
    }

    return `Get weather data for: ${locationStr}

Instructions:
- Create a Google-style weather widget using markdown
- Use Google Weather API to get accurate, real-time data
- DO NOT provide JSON, data structures, or technical details
- Write a natural, user-friendly weather summary
- Only use fahrenheit
- Focus on clarity and readability

Use this exact format to create a Google-style weather widget:

# ☀️
## **[TEMP]°F**
### [City, State]
**[Condition] • [Day, Time]**

**Precipitation:** [X]% • **Humidity:** [X]% • **Wind:** [X] mph  

---

### 3-Day Outlook

| | Day | High/Low | Conditions |
|:--:|:----|:---------|:-----------|
| [emoji] | **[Day]** | **[high]°**/**[low]°** | [condition] |
| [emoji] | [Day] | [high]°/[low]° | [condition] |
| [emoji] | [Day] | [high]°/[low]° | [condition] |

Use appropriate weather emojis:
- ☀️ Clear/Sunny
- 🌤️ Mostly sunny
- ⛅ Partly cloudy
- ☁️ Cloudy
- 🌧️ Rain/Showers
- ⛈️ Thunderstorm
- ❄️ Snow
- 🌫️ Fog/Mist`;
  }
}

class WeatherJsonPromptGenerator extends PromptGenerator {
  generate(analysis: QueryAnalysis, context: QueryContext): string {
    const location = analysis.extractedData.weatherLocation || "the specified location";
    const addressComponents = context.addressComponents;

    let locationStr = location;
    if (addressComponents && addressComponents.latitude && addressComponents.longitude) {
      locationStr = `${addressComponents.city || location}, ${addressComponents.state || ""} (Lat: ${addressComponents.latitude}, Lon: ${addressComponents.longitude})`;
    }

    return `Get weather data for: ${locationStr}

Instructions:
- Use Google Weather API to fetch accurate, real-time weather data
- Return ONLY valid JSON - no markdown, no text, no explanations
- The response must start with { and end with }
- Use this exact structure:

{
  "location": {
    "city": "City Name",
    "state": "State",
    "country": "Country",
    "lat": latitude,
    "lon": longitude
  },
  "current": {
    "temp_f": temperature,
    "condition": "condition",
    "emoji": "appropriate weather emoji",
    "wind_mph": wind_speed,
    "wind_dir": "direction",
    "humidity": percentage,
    "feels_like_f": temperature,
    "uv_index": index,
    "precipitation": percentage
  },
  "forecast": [
    {
      "date": "YYYY-MM-DD",
      "day_name": "Monday",
      "high_f": temp,
      "low_f": temp,
      "condition": "condition",
      "emoji": "weather emoji",
      "chance_of_rain": percentage
    },
    {
      "date": "YYYY-MM-DD",
      "day_name": "Tuesday",
      "high_f": temp,
      "low_f": temp,
      "condition": "condition",
      "emoji": "weather emoji",
      "chance_of_rain": percentage
    },
    {
      "date": "YYYY-MM-DD",
      "day_name": "Wednesday",
      "high_f": temp,
      "low_f": temp,
      "condition": "condition",
      "emoji": "weather emoji",
      "chance_of_rain": percentage
    }
  ],
  "last_updated": "timestamp"
}

- Include exactly 3 days in forecast
- Ensure all numeric values are numbers, not strings
- Use appropriate weather emojis: ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ ❄️ 🌫️
- If unable to get weather data, return: {"error": "reason"}`;
  }
}

// Address Analyzer and Generator
class AddressAnalyzer extends QueryAnalyzer {
  async analyze(query: string, _context: QueryContext): Promise<QueryAnalysis> {
    const normalized = this.normalizeQuery(query);

    // Check if it starts with a number (typical for addresses)
    if (!/^\d+/.test(query.trim())) {
      return {
        type: QueryType.ADDRESS,
        confidence: 0.0,
        extractedData: {},
        requiresLocation: false,
        hasExplicitLocation: true,
      };
    }

    // Street type patterns
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
    ];

    const hasStreetType = streetTypes.some((type) => {
      const regex = new RegExp(`\\b${type}\\b`, "i");
      return regex.test(normalized);
    });

    // If we have addressComponents from Places API, boost confidence
    const hasPlacesData = !!_context.addressComponents;

    const confidence = hasStreetType ? (hasPlacesData ? 0.95 : 0.8) : 0.2;

    return {
      type: QueryType.ADDRESS,
      confidence,
      extractedData: {
        addressString: query,
      },
      requiresLocation: false,
      hasExplicitLocation: true,
    };
  }
}

class AddressPromptGenerator extends PromptGenerator {
  generate(analysis: QueryAnalysis, context: QueryContext): string {
    const query = analysis.extractedData.addressString || "";
    const sources = context.sources || [];

    return `For the address "${query}", provide detailed location information.

${this.formatSources(sources)}

Instructions:
- Extract all available location information from the sources
- If this is a business, include all business details (name, type, hours, reviews, contact)
- Include information about the area, nearby landmarks, and neighborhood
- Provide any available geographic coordinates
- Format the response in a clear, structured way with sections
- Use **bold** for important details
- If coordinates are found, mention them clearly
- Cite sources with [1], [2], etc.`;
  }
}

// Local Business Analyzer and Generator
class LocalBusinessAnalyzer extends QueryAnalyzer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyze(query: string, _context: QueryContext): Promise<QueryAnalysis> {
    const normalized = this.normalizeQuery(query);

    // Location modifiers
    const locationModifiers = ["near me", "nearby", "closest", "nearest", "around here"];
    const hasLocationModifier = locationModifiers.some((mod) => normalized.includes(mod));

    // Business types
    const businessTypes = [
      "restaurant",
      "cafe",
      "coffee",
      "bar",
      "pub",
      "hotel",
      "store",
      "shop",
      "pharmacy",
      "hospital",
      "clinic",
      "bank",
      "atm",
      "gas station",
      "gym",
    ];

    const hasBusinessType = businessTypes.some((type) => normalized.includes(type));

    // Known business names
    const knownBusinesses = ["apple store", "tesla", "starbucks", "mcdonalds", "walmart", "target"];

    const hasKnownBusiness = knownBusinesses.some((business) => normalized.includes(business));

    const confidence = hasLocationModifier || hasBusinessType || hasKnownBusiness ? 0.85 : 0.0;

    return {
      type: QueryType.LOCAL_BUSINESS,
      confidence,
      extractedData: {
        businessName: query,
      },
      requiresLocation: hasLocationModifier,
      hasExplicitLocation: !hasLocationModifier,
    };
  }
}

class LocalBusinessPromptGenerator extends PromptGenerator {
  generate(analysis: QueryAnalysis, context: QueryContext): string {
    const query = analysis.extractedData.businessName || "";
    const sources = context.sources || [];
    const userLocation = context.userLocation;

    let prompt = `Create a Google AI Overview for: "${query}"`;

    if (userLocation?.city && userLocation?.region) {
      prompt += ` (location: ${userLocation.city}, ${userLocation.region})`;
    }

    prompt += `\n\n${this.formatSources(sources)}`;

    prompt += `

Instructions:
- Provide a comprehensive, well-structured answer about local businesses
- Include location, hours, services, contact info, reviews
- Use markdown formatting with **bold** for emphasis
- Structure the response with clear sections
- Give priority to local results
- Cite sources inline using [1], [2], etc.
- Be concise but thorough (aim for 200-400 words)
- Use bullet points for lists`;

    return prompt;
  }
}

// General Analyzer and Generator (fallback)
class GeneralAnalyzer extends QueryAnalyzer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyze(query: string, _context: QueryContext): Promise<QueryAnalysis> {
    // This is the fallback analyzer, always returns moderate confidence
    return {
      type: QueryType.GENERAL,
      confidence: 0.5,
      extractedData: {
        query: query,
      },
      requiresLocation: false,
      hasExplicitLocation: false,
    };
  }
}

class GeneralPromptGenerator extends PromptGenerator {
  generate(analysis: QueryAnalysis, context: QueryContext): string {
    const sources = context.sources || [];
    const userLocation = context.userLocation;
    const conversationContext = context.conversationContext;

    let prompt = `Create a Google AI Overview for: "${analysis.extractedData.query || context.sources?.[0]?.title || "the query"}"`;

    if (userLocation?.city && userLocation?.region) {
      prompt += ` (location: ${userLocation.city}, ${userLocation.region})`;
    }

    // Add conversation context if this is a follow-up
    if (conversationContext) {
      prompt += `\n\n### Previous Conversation\n`;
      prompt += `User asked: "${conversationContext.originalQuery}"\n`;

      // Smart truncation for long responses to manage token usage
      const prevResponse = conversationContext.previousResponse;
      const maxLength = 2000; // characters, roughly 500-600 tokens

      if (prevResponse.length <= maxLength) {
        prompt += `You responded: ${prevResponse}\n\n`;
      } else {
        // Keep beginning and end, which usually contain key information
        const headLength = Math.floor(maxLength * 0.6); // 60% from start
        const tailLength = Math.floor(maxLength * 0.3); // 30% from end

        const head = prevResponse.substring(0, headLength);
        const tail = prevResponse.substring(prevResponse.length - tailLength);

        // Find clean break points
        const headBreak = head.lastIndexOf(". ") > 0 ? head.lastIndexOf(". ") + 1 : headLength;
        const tailBreak = tail.indexOf(". ") > 0 ? tail.indexOf(". ") + 2 : 0;

        const truncatedResponse =
          prevResponse.substring(0, headBreak) +
          "\n\n[... response truncated for context ...]\n\n" +
          tail.substring(tailBreak);

        prompt += `You responded (truncated for context): ${truncatedResponse}\n\n`;
        prompt += `Note: The middle portion of your previous response was omitted to save tokens. Focus on the user's follow-up question.\n\n`;
      }

      prompt += `The user is now asking a follow-up question. Build upon your previous answer without repeating the same information.\n`;
    }

    prompt += `\n\n${this.formatSources(sources)}`;

    prompt += `

Instructions:
- Provide a comprehensive, well-structured answer
- Use markdown formatting with **bold** for emphasis
- Structure the response with clear sections if appropriate
- Include specific facts and details from the sources
- For health topics: Include stages, symptoms, complications, treatment
- For products: Include features, comparisons, recommendations
- For places/businesses: Include location, hours, services, contact info, reviews
- For how-to: Include step-by-step instructions
- Cite sources inline using [1], [2], etc.
- Be concise but thorough (aim for 200-400 words)
- Use bullet points for lists
- Start with a brief summary paragraph`;

    if (conversationContext) {
      prompt += `\n- Reference the previous conversation when relevant
- Build upon the previous answer rather than repeating it
- Clarify or expand on topics mentioned previously`;
    }

    prompt += `\n\nRemember: Write in a clear, authoritative tone like Google's AI Overviews.`;

    return prompt;
  }
}
