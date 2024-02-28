import { isNotionClientError } from "@notionhq/client";
import { showToast, Toast } from "@raycast/api";

import { NotionObject, Page } from ".";

export function isNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input != null;
}

export function handleError<T>(err: unknown, title: string, returnValue: T): T {
  console.error(err);
  if (isNotionClientError(err)) {
    showToast({
      style: Toast.Style.Failure,
      title: err.message,
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title,
    });
  }
  return returnValue;
}

export function pageMapper(jsonPage: NotionObject): Page {
  const page: Page = {
    object: jsonPage.object,
    id: jsonPage.id,
    title: "Untitled",
    properties: {},
    created_by: "created_by" in jsonPage && jsonPage.created_by.object === "user" ? jsonPage.created_by.id : undefined,
    parent_page_id: "parent" in jsonPage && "page_id" in jsonPage.parent ? jsonPage.parent.page_id : undefined,
    parent_database_id:
      "parent" in jsonPage && "database_id" in jsonPage.parent ? jsonPage.parent.database_id : undefined,
    last_edited_time: "last_edited_time" in jsonPage ? new Date(jsonPage.last_edited_time).getTime() : undefined,
    last_edited_user:
      "last_edited_by" in jsonPage && jsonPage.last_edited_by.object === "user"
        ? jsonPage.last_edited_by.id
        : undefined,
    icon_emoji: "icon" in jsonPage && jsonPage.icon?.type === "emoji" ? jsonPage.icon.emoji : null,
    icon_file: "icon" in jsonPage && jsonPage.icon?.type === "file" ? jsonPage.icon.file.url : null,
    icon_external: "icon" in jsonPage && jsonPage.icon?.type === "external" ? jsonPage.icon.external.url : null,
    url: "url" in jsonPage ? jsonPage.url : undefined,
  };

  if (jsonPage.object === "page" && "properties" in jsonPage) {
    page.properties = jsonPage.properties;
    Object.keys(jsonPage.properties).forEach((pk) => {
      const property = jsonPage.properties[pk];

      // Save page title
      if (property.type === "title") {
        if (property.title[0]?.plain_text) {
          page.title = property.title[0].plain_text;
        }
      }
    });
  }

  if ("title" in jsonPage && jsonPage.title[0]?.plain_text) {
    page.title = jsonPage.title[0]?.plain_text;
  }

  return page;
}
