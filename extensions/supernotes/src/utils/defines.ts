import { environment } from "@raycast/api";

export const SUPERNOTES_API_URL = environment.isDevelopment
  ? "http://127.0.0.1:5000/v1"
  : "https://api.supernotes.app/v1";
