/**
 * API ENDPOINTS CONFIGURATION
 *
 * For local development:
 * 1. Create a .env file in the project root
 * 2. Add DOMAIN_API_ENDPOINT=your_api_url to the .env file
 * 3. Run `ray develop` to use your local environment variables
 *
 * For production use, the API endpoint is secured via environment variables.
 * If no environment variable is found, the default endpoint is used.
 */
export const API_ENDPOINT =
  process.env.DOMAIN_API_ENDPOINT ||
  "https://5qbo4f2ir7.execute-api.eu-west-1.amazonaws.com/default/Search_Domain_For_Raycast_Extension";
