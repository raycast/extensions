import moment from "moment-timezone";

export function dateToReadableDate(date: Date): string {
  return moment(date).tz("Europe/Paris").format("DD/MM/YYYY HH:mm");
}
