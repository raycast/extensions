# Google Maps Search

## Setup

1. You'll need a Google Places API key to use the full functionality of this extension. To obtain one:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to APIs & Services > [Library](https://console.cloud.google.com/apis/library)
   - Enable the [**Places API**](https://console.cloud.google.com/apis/library/places-backend.googleapis.com), [**Maps JavaScript API**](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com), [**Maps Static API**](https://console.cloud.google.com/apis/library/static-maps-backend.googleapis.com), [**Geocoding API**](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com)
   - Navigate to APIs & Services > [Credentials](https://console.cloud.google.com/apis/credentials)
   - Create an API key under APIs & Services > Credentials
   - Enter this API key in the Raycast extension preferences
2. Enter your home address in the Raycast preferences. It will be used to quickly pull up directions to your home.
3. Select your preferred mode of travel. This will be the default for all searches.
4. For full functionality, you should allow [Google Maps](https://www.google.com/maps) to access your location in your preferred browser. This way, `Get Me Home` and `Get Me Somewhere` will immediately pull up directions starting from your current location.

## Searching

Use the extension's search fields as you would use the ones on Google Maps. They can take regular addresses, as well as building names.

## AI Tools

This extension provides several AI tools that can be used with Raycast AI to enhance your Google Maps experience:

### Find Places

Find places by name or description. Simply ask Raycast AI to find places matching your query.

**Example prompts:**

- "Find coffee shops in San Francisco"
- "Show me pizza restaurants near downtown"
- "What are some parks in Seattle?"

### Get Directions

Get directions between locations with your preferred mode of transportation.

**Example prompts:**

- "How do I get to the Empire State Building?"
- "Get directions from Central Park to Times Square"
- "Show me walking directions to the nearest grocery store"

### Get Place Details

Get detailed information about a specific place, including address, phone number, website, opening hours, and reviews.

**Example prompts:**

- "Tell me about Golden Gate Park"
- "What are the details for Statue of Liberty?"
- "Show me information about Eiffel Tower"

### Search Nearby Places

Find places of a specific type near a location.

**Example prompts:**

- "Find restaurants near my home"
- "What are some open cafes near Central Park?"
- "Show me gas stations within 5 miles of my current location"

## Troubleshooting API Keys

If you're experiencing issues with your Google API key, you can use the included testing script to verify which APIs are properly enabled and working:

1. Open a terminal and navigate to the extension directory
2. Run the API test script with your API key:

   ```bash
   node src/utils/api-test.mjs YOUR_API_KEY
   ```

3. The script will test each required API and show you which ones are working and which need to be enabled
4. For any API showing a 403 error, you'll need to enable it in the Google Cloud Console:
   - Go to [Google Cloud Console API Library](https://console.cloud.google.com/apis/library)
   - Search for the API name (Places API, Geocoding API, etc.)
   - Click on the API and then click "Enable"
   - Wait a few minutes for the changes to take effect

The most common issue is that the Places API needs to be enabled separately from the other APIs.

## Privacy

This extension only stores your address locally to pass it to the Google Maps API. This extension does nothing else with your info.
