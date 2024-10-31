import { showHUD, Clipboard } from "@raycast/api";
import paste = Clipboard.paste;

export default async function main() {
  const now = new Date()
  const myopts: Intl.DateTimeFormatOptions = {
    year: 'numeric',      // numeric representation of the year
    month: 'numeric',        // full name of the month
    day: 'numeric',       // numeric representation of the day
    hour: '2-digit',      // two-digit hour
    minute: '2-digit',    // two-digit minute
    second: '2-digit',    // two-digit second
    hour12: false         // using 24-hour format
  };

  await showHUD("Pasted long date.");
  await paste(now.toLocaleDateString("en-GB", myopts));
  }