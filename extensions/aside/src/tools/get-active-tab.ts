import { getLiveTabSnapshot } from "../lib/tabs";

/** Get the active tab from Aside's frontmost window without focusing the browser. */
export default async function tool() {
  const snapshot = await getLiveTabSnapshot();
  const tab = snapshot.tabs.find((candidate) => candidate.windowIndex === 1 && candidate.isActive) ?? null;
  return { browserStatus: snapshot.browserStatus, tab };
}
