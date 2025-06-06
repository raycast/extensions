// Gemini service integration prompts
// This file contains prompts to leverage Gemini's access to Google services

export interface GeminiServiceRequest {
  type: "weather" | "maps" | "places" | "geocode" | "directions" | "translate";
  query: string;
  params?: Record<string, unknown>;
}

/**
 * Generate a prompt for Gemini to use Google services
 */
export function generateServicePrompt(request: GeminiServiceRequest): string {
  switch (request.type) {
    case "weather":
      return generateWeatherPrompt(request);
    case "maps":
      return generateMapsPrompt(request);
    case "places":
      return generatePlacesPrompt(request);
    case "geocode":
      return generateGeocodePrompt(request);
    case "directions":
      return generateDirectionsPrompt(request);
    case "translate":
      return generateTranslatePrompt(request);
    default:
      throw new Error(`Unknown service type: ${request.type}`);
  }
}

function generateWeatherPrompt(request: GeminiServiceRequest): string {
  const { query, params } = request;
  return `Get weather data for: ${query}${params?.lat && params?.lon ? ` (Lat: ${params.lat}, Lon: ${params.lon})` : ""}

Instructions:
- Use Google Weather API to fetch current weather data
- Return the response in valid JSON format with this structure:
{
  "location": {
    "city": "City Name",
    "state": "State",
    "country": "Country",
    "lat": latitude,
    "lon": longitude
  },
  "current": {
    "temp_f": temperature in fahrenheit,
    "temp_c": temperature in celsius,
    "condition": "weather condition description",
    "emoji": "appropriate weather emoji (☀️/🌧️/☁️/⛈️/❄️/🌫️)",
    "wind_mph": wind speed,
    "wind_dir": "wind direction",
    "humidity": humidity percentage,
    "feels_like_f": feels like in fahrenheit,
    "feels_like_c": feels like in celsius,
    "visibility_miles": visibility,
    "uv_index": UV index,
    "pressure_mb": pressure
  },
  "forecast": [
    {
      "date": "YYYY-MM-DD",
      "day_name": "Monday",
      "high_f": high temp fahrenheit,
      "low_f": low temp fahrenheit,
      "high_c": high temp celsius,
      "low_c": low temp celsius,
      "condition": "weather condition",
      "emoji": "weather emoji",
      "chance_of_rain": percentage
    }
  ],
  "last_updated": "timestamp"
}`;
}

function generateMapsPrompt(request: GeminiServiceRequest): string {
  const { query } = request;
  return `Generate map data for: ${query}

Instructions:
- Use Google Maps to get location and map information
- Return JSON with:
{
  "location": {
    "address": "full formatted address",
    "lat": latitude,
    "lon": longitude,
    "place_id": "Google place ID if available"
  },
  "map": {
    "static_map_url": "URL for static map image with marker",
    "zoom_level": recommended zoom level,
    "map_type": "roadmap/satellite/hybrid/terrain"
  },
  "nearby": [
    {
      "name": "nearby place name",
      "type": "restaurant/cafe/store/etc",
      "distance": "distance in miles",
      "rating": rating if available
    }
  ]
}`;
}

function generatePlacesPrompt(request: GeminiServiceRequest): string {
  const { query, params } = request;
  return `Find places for: ${query}${params?.location ? ` near ${params.location}` : ""}

Instructions:
- Use Google Places API to find relevant places
- Return JSON with:
{
  "places": [
    {
      "name": "place name",
      "address": "full address",
      "lat": latitude,
      "lon": longitude,
      "rating": rating out of 5,
      "user_ratings_total": number of reviews,
      "price_level": price level (1-4),
      "types": ["restaurant", "food", etc],
      "opening_hours": {
        "open_now": true/false,
        "hours": ["Monday: 9:00 AM – 5:00 PM", ...]
      },
      "phone": "phone number",
      "website": "website URL",
      "distance": "distance from search location if applicable"
    }
  ],
  "total_results": total number found
}`;
}

function generateGeocodePrompt(request: GeminiServiceRequest): string {
  const { query } = request;
  return `Geocode this location: ${query}

Instructions:
- Use Google Geocoding API to get precise location data
- Return JSON with:
{
  "results": [
    {
      "formatted_address": "full formatted address",
      "lat": latitude,
      "lon": longitude,
      "place_id": "Google place ID",
      "types": ["locality", "political", etc],
      "address_components": {
        "street_number": "123",
        "street_name": "Main Street",
        "city": "City Name",
        "state": "State",
        "country": "Country",
        "postal_code": "12345"
      },
      "confidence": "high/medium/low"
    }
  ]
}`;
}

function generateDirectionsPrompt(request: GeminiServiceRequest): string {
  const { params } = request;
  return `Get directions from "${params?.origin}" to "${params?.destination}"

Instructions:
- Use Google Directions API
- Return JSON with:
{
  "routes": [
    {
      "summary": "route summary (e.g., 'Via I-405 N')",
      "distance": {
        "text": "15.2 miles",
        "value": 24461 // meters
      },
      "duration": {
        "text": "25 mins",
        "value": 1500 // seconds
      },
      "steps": [
        {
          "instruction": "Head north on Main St",
          "distance": "0.5 mi",
          "duration": "2 mins"
        }
      ],
      "warnings": ["Toll road", etc] if any
    }
  ],
  "origin": {
    "address": "formatted address",
    "lat": latitude,
    "lon": longitude
  },
  "destination": {
    "address": "formatted address",
    "lat": latitude,
    "lon": longitude
  }
}`;
}

function generateTranslatePrompt(request: GeminiServiceRequest): string {
  const { query, params } = request;
  return `Translate: "${query}" from ${params?.source || "auto"} to ${params?.target || "English"}

Instructions:
- Use Google Translate API
- Return JSON with:
{
  "translation": "translated text",
  "source_language": "detected or specified source language",
  "target_language": "target language",
  "confidence": confidence score if available,
  "alternatives": ["alternative translation 1", "alternative translation 2"] if available,
  "pronunciation": "pronunciation guide if applicable"
}`;
}

/**
 * Parse Gemini's response to extract JSON data
 */
export function parseGeminiServiceResponse(response: string): unknown {
  try {
    // Extract JSON from the response (it might have extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Failed to parse Gemini service response:", error);
    return null;
  }
}

/**
 * Create a multi-service prompt for complex queries
 */
export function generateMultiServicePrompt(query: string, services: string[]): string {
  return `For the query "${query}", use the following Google services to provide comprehensive information:

Services to use: ${services.join(", ")}

Return a JSON response with data from each service:
{
  "query": "${query}",
  "results": {
    ${services.includes("geocode") ? '"geocode": { /* geocoding data */ },' : ""}
    ${services.includes("places") ? '"places": { /* places data */ },' : ""}
    ${services.includes("weather") ? '"weather": { /* weather data */ },' : ""}
    ${services.includes("maps") ? '"maps": { /* map data */ },' : ""}
    ${services.includes("directions") ? '"directions": { /* directions data */ }' : ""}
  }
}

Include all relevant data from each service in the appropriate section.`;
}
