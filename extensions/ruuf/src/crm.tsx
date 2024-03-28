import { Clipboard, getSelectedText, open, showToast, Toast } from "@raycast/api";
import { fetchBookingId } from "./monolith";

function isEmpty(s: string | null | undefined): boolean {
  return !(s != null && String(s).length > 0);
}

async function getText(): Promise<string | undefined> {
  return getSelectedText()
    .then(async (text) => (!isEmpty(text) ? text : await Clipboard.readText()))
    .catch(async () => await Clipboard.readText())
    .then((item) => (!isEmpty(item) ? item : ""))
    .catch(() => "" as string);
}

function getBookingUrl(bookingId: string) { 
  return `https://ruuf.retool.com/apps/da94484c-d63a-11ee-a9e5-8f675fc2d780/Sales%20CRM?bookingId=${bookingId}`
}

export default async function Main() {
  const text = await getText();

  if (!text ) {
    await showToast(Toast.Style.Failure, "example no-view command");
    return
  }

  const bookingId = await fetchBookingId(text);
  const url = getBookingUrl(bookingId);

  return open(url);
}
