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

function getInformeFinalUrl(bookingId: string) { 
  return `https://ruuf.retool.com/apps/377574c6-6c3e-11ee-bcd6-e301db4fa05f/Guille/Informes%20Finales?bookingId=${bookingId}`
}

export default async function Main() {
  const text = await getText();

  if (!text ) {
    await showToast(Toast.Style.Failure, "example no-view command");
    return
  }

  const bookingId = await fetchBookingId(text);
  const url = getInformeFinalUrl(bookingId);

  return open(url);
}
