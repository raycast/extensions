import { format } from "date-fns";

export function adminUrl(url: string): string {
  return url.replace("api.typeform", "admin.typeform");
}
export function formatStringAsDate(date: string, _format: string) {
  return format(new Date(date), _format);
}
