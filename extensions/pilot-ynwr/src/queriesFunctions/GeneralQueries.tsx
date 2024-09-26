import { APIResponseError, Client } from "@notionhq/client";
import { showToast } from "@raycast/api";
import { getAPIError } from "../tools/generalTools";

export const QueryDeleteItem = async (id: string, notion: Client | undefined) => {
  await notion?.pages.update(deleteItemJson(id)).catch((e: APIResponseError) => {
    return showToast({ title: getAPIError(e.code as string, "Item") });
  });
  return true;
};

const deleteItemJson = (id: string) => {
  return {
    page_id: id,
    in_trash: true,
  };
};
