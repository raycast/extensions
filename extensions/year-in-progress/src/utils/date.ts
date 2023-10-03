import { format } from "date-fns";

export function formatDate(date: number) {
  return format(new Date(date), "MM/dd/yyyy HH:mm:ss");
}
