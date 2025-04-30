// API ENDPOINTS
// Note: This should be moved to environment variables when officially deploying
// For Raycast Store, we need to keep it here for review purposes
export const API_ENDPOINT =
  process.env.DOMAIN_API_ENDPOINT ||
  "https://5qbo4f2ir7.execute-api.eu-west-1.amazonaws.com/default/Search_Domain_For_Raycast_Extension";
