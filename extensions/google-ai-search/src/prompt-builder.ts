import { Source, UserLocation, AddressComponents } from "./types";

export class PromptBuilder {
  private sections: string[] = [];

  addQuery(query: string): PromptBuilder {
    this.sections.push(`Query: "${query}"`);
    return this;
  }

  addWeatherQuery(location: string, addressComponents?: AddressComponents): PromptBuilder {
    if (addressComponents && addressComponents.latitude && addressComponents.longitude) {
      this.sections.push(
        `Get weather data for: ${addressComponents.city || location}, ${addressComponents.state || ""} (Lat: ${addressComponents.latitude}, Lon: ${addressComponents.longitude})`,
      );
    } else {
      this.sections.push(`Get weather data for: ${location}`);
    }
    return this;
  }

  addAddressQuery(query: string): PromptBuilder {
    this.sections.push(`For the address "${query}", provide detailed location information.`);
    return this;
  }

  addGeneralQuery(query: string, userLocation?: UserLocation): PromptBuilder {
    let queryText = `Create a Google AI Overview for: "${query}"`;
    if (userLocation?.city && userLocation?.region) {
      queryText += ` (location: ${userLocation.city}, ${userLocation.region})`;
    }
    this.sections.push(queryText);
    return this;
  }

  addSources(sources: Source[]): PromptBuilder {
    const sourceContext = sources
      .map((source, index) => `[${index + 1}] ${source.title} (${source.displayUrl})\n${source.snippet}`)
      .join("\n\n");

    this.sections.push(`Sources:\n${sourceContext}`);
    return this;
  }

  addWeatherInstructions(): PromptBuilder {
    const instructions = `Instructions:
- Use Google Weather API to fetch current weather data
- Return ONLY valid JSON - no markdown, no code blocks, no extra text
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
}
- Include 3-5 day forecast
- Ensure all numeric values are numbers, not strings
- Use appropriate weather emojis based on conditions
- If unable to get weather data, return an error in JSON: {"error": "reason"}`;

    this.sections.push(instructions);
    return this;
  }

  addAddressInstructions(): PromptBuilder {
    const instructions = `Instructions:
- Extract all available location information from the sources
- If this is a business, include all business details (name, type, hours, reviews, contact)
- Include information about the area, nearby landmarks, and neighborhood
- Provide any available geographic coordinates
- Format the response in a clear, structured way with sections
- Use **bold** for important details
- If coordinates are found, mention them clearly
- Cite sources with [1], [2], etc.`;

    this.sections.push(instructions);
    return this;
  }

  addGeneralInstructions(shouldPrioritizeLocal: boolean = false): PromptBuilder {
    const instructions = `Instructions:
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
- Start with a brief summary paragraph
${shouldPrioritizeLocal ? "- Give priority to local results when relevant" : ""}

Remember: Write in a clear, authoritative tone like Google's AI Overviews.`;

    this.sections.push(instructions);
    return this;
  }

  addLocationContext(location: UserLocation): PromptBuilder {
    this.sections.push(`User Location: ${location.city}, ${location.region}`);
    return this;
  }

  build(): string {
    return this.sections.join("\n\n");
  }

  addWeatherSummaryInstructions(): PromptBuilder {
    const instructions = `Instructions:
- Provide current weather conditions and forecast
- Use markdown formatting with **bold** for emphasis
- Include temperature in both Fahrenheit and Celsius
- Start with current conditions: temperature, feels like, condition, wind
- Follow with a 3-5 day forecast summary
- Use weather emojis appropriately (☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ ❄️ 🌫️)
- Keep the response concise (150-250 words)
- Cite sources with [1], [2], etc.
- Format example:

## Current Weather in [City]
☀️ **Currently:** 72°F (22°C), Sunny
**Feels like:** 75°F (24°C)
**Wind:** 10 mph NW
**Humidity:** 45%

## Forecast
**Today:** High 78°F, Low 62°F - Sunny ☀️
**Tomorrow:** High 75°F, Low 60°F - Partly cloudy ⛅
**Thursday:** High 70°F, Low 58°F - Chance of rain 🌧️ 40%`;

    this.sections.push(instructions);
    return this;
  }

  addWeatherHybridInstructions(): PromptBuilder {
    const instructions = `Instructions:
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

| Day | High/Low | Conditions |
|:--:|:----|:---------|:-----------|
| **[Day]** | **[high]°**/**[low]°** | [emoji][condition] |
| [Day] | [high]°/[low]° | [emoji][condition] |
| [Day] | [high]°/[low]° | [emoji][condition] |

Example output:

# ☀️
## **72°F**
### Los Angeles, CA
**Clear • Monday, 2:45 PM**

**Precipitation:** 0% • **Humidity:** 45% • **Wind:** 10 mph NW

---

### 3-Day Outlook

| Day | High/Low | Conditions |
|:--:|:----|:---------|:-----------|
|  **Today** | **78°**/**62°** | ☀️Sunny |
|  Tuesday | 75°/60° | 🌤️ Mostly sunny |
|  Wednesday | 73°/58° | ⛅ Partly cloudy |

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
After the line "---JSON-DATA---", provide ONLY valid JSON with this structure:
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
      "chance_of_rain": percentage
    }
  ]
}`;

    this.sections.push(instructions);
    return this;
  }

  // Convenience methods for common patterns
  static buildWeatherPrompt(location: string, addressComponents?: AddressComponents): string {
    return new PromptBuilder().addWeatherQuery(location, addressComponents).addWeatherInstructions().build();
  }

  static buildWeatherSummaryPrompt(location: string, sources: Source[], addressComponents?: AddressComponents): string {
    return new PromptBuilder()
      .addWeatherQuery(location, addressComponents)
      .addSources(sources)
      .addWeatherSummaryInstructions()
      .build();
  }

  static buildWeatherHybridPrompt(location: string, addressComponents?: AddressComponents): string {
    return new PromptBuilder().addWeatherQuery(location, addressComponents).addWeatherHybridInstructions().build();
  }

  static buildAddressPrompt(query: string, sources: Source[]): string {
    return new PromptBuilder().addAddressQuery(query).addSources(sources).addAddressInstructions().build();
  }

  static buildGeneralPrompt(
    query: string,
    sources: Source[],
    userLocation?: UserLocation,
    shouldPrioritizeLocal: boolean = false,
  ): string {
    return new PromptBuilder()
      .addGeneralQuery(query, userLocation)
      .addSources(sources)
      .addGeneralInstructions(shouldPrioritizeLocal)
      .build();
  }
}
