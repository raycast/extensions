export const BASE_API_URL = "https://api.jolpi.ca/ergast";
// jolpica-f1 rejects default user agents such as node-fetch: https://github.com/jolpica/jolpica-f1/discussions/386
export const API_HEADERS = { "User-Agent": "raycast-f1-standings/1.0.0" };
