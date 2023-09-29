import { authorize, notion } from "./authorize";
import { handleError, pageMapper } from "./global";

export async function fetchPage(pageId: string) {
  try {
    await authorize();
    const page = await notion.pages.retrieve({
      page_id: pageId,
    });

    return pageMapper(page);
  } catch (err) {
    return handleError(err, "Failed to fetch page", undefined);
  }
}

export async function fetchDatabase(pageId: string) {
  try {
    await authorize();
    const page = await notion.databases.retrieve({
      database_id: pageId,
    });

    return pageMapper(page);
  } catch (err) {
    return handleError(err, "Failed to fetch database", undefined);
  }
}
