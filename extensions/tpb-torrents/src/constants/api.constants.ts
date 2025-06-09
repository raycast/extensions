export const API_BASE_URL = "https://apibay.org";

export const API_ENDPOINTS = {
  search: (query: string) => `${API_BASE_URL}/q.php?q=${encodeURIComponent(query)}&cat=0`,
  torrentDetail: (id: string) => `${API_BASE_URL}/t.php?id=${id}`,
  torrentPage: (id: string) => `https://thepiratebay.org/description.php?id=${id}`,
} as const;

export const CATEGORY_ICONS = {
  "100": "Video",
  "200": "Music",
  "300": "Desktop",
  "400": "GameController",
  "500": "Document",
  "600": "Video",
} as const;

export const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
