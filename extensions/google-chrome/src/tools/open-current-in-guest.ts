import { getActiveTabURL, createNewGuestWindowToWebsite } from "../actions";

export default async function () {
  const url = await getActiveTabURL();

  if (!url || url === "") {
    return "No active tab URL found";
  }

  await createNewGuestWindowToWebsite(url);

  return `Opening current tab URL in Guest window: ${url}`;
}
