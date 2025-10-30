import { URL } from "url";
import { API_BASE } from "../constants";

export function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const u = new URL(API_BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined) return;
      u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}

export default { buildUrl };
