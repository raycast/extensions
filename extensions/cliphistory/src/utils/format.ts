import { MAX_CONTENT_LENGTH_DISPLAY } from "../constants";

export function formatPreview(content: string) {
  const flat = content.replace(/\n/g, " ");
  return flat.length > MAX_CONTENT_LENGTH_DISPLAY ? `${flat.slice(0, MAX_CONTENT_LENGTH_DISPLAY)}...` : flat;
}
