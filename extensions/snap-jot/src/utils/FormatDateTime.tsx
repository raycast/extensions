export function formatDateTime(date: Date, format: string, is12: boolean = false) {
  const hours = date.getHours();
  const isAM = hours < 12 || hours === 24;
  const ampm = isAM ? "AM" : "PM";
  const hours12 = (hours % 12 || 12).toString().padStart(2, "0");

  const tokens: { [key: string]: string } = {
    YYYY: date.getFullYear().toString(),
    YY: date.getFullYear().toString().slice(-2),
    MM: (date.getMonth() + 1).toString().padStart(2, "0"),
    DD: date.getDate().toString().padStart(2, "0"),
    HH: is12 ? hours12 : date.getHours().toString().padStart(2, "0"),
    mm: date.getMinutes().toString().padStart(2, "0"),
    ss: date.getSeconds().toString().padStart(2, "0"),
    A: is12 ? ampm : "",
  };

  return format.replace(/YYYY|YY|MM|DD|HH|mm|ss|A/g, (match) => tokens[match]);
}

export function replaceDatePlaceholders(date: Date, text: string): string {
  return text.replace(/{{date:([^}]+)}}/g, (_, dateFormat) => formatDateTime(date, dateFormat));
}
