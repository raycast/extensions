import { openSowiksPage } from "./lib/sowiks";

export default async function Command() {
  await openSowiksPage("https://app.sowiks.com/dashboard/connect");
}
