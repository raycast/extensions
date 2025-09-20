export function generateApiUrl(endpoint: string, params?: Record<string, string>) {
  let url = "https://api.sav.com/domains_api_v1/" + endpoint;
  if (params) url += "?" + new URLSearchParams(params);
  return url;
}
