import { URL } from "url";
import { API_BASE } from "../constants";

export function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const base = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const u = new URL(normalizedPath, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined) return;
      u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}

export default { buildUrl };
