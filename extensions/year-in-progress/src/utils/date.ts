import { format } from "date-fns";

export function formatDate(date: string) {
  return format(new Date(date), "MM/dd/yyyy hh:mm:ss");
}
