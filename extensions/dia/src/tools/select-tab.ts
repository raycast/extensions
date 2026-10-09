import { focusTab } from "../dia";
import { findTab, toAutomationError, type TabTarget } from "../find-tab";

/**
 * Switches to an open Dia tab and brings Dia to the front.
 */
export default async function tool(input: TabTarget) {
  const tab = await findTab(input);
  await focusTab(tab).catch((error) => {
    throw toAutomationError(error);
  });
  return { title: tab.title, url: tab.url };
}
