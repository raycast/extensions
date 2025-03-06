import { showFailureToast } from "@raycast/utils";
import { BringAPI, BringCatalog, BringListInfo } from "../lib/bringAPI";
import { getBringApi } from "../lib/bringService";

type ListInfoWithItems = {
  list: BringListInfo;
  isDefaultList: boolean;
  itemsToPurchase: string[];
  language: string;
  customCatalogItems?: string[];
};

export default async function tool() {
  try {
    const bringApi = await getBringApi();
    const settings = await bringApi.getUserSettings();

    // Create a map of list UUID to language for quick lookup
    const listLanguageMap = new Map(
      settings.userlistsettings.map((setting) => [
        setting.listUuid,
        setting.usersettings.find(({ key }) => key === "listArticleLanguage")?.value || "en-US",
      ]),
    );

    const defaultListUUID = settings.usersettings.find((s) => s.key === "defaultListUUID")?.value || null;

    const listInfosWithItems = await getCurrentListsAndTheirItems(bringApi, listLanguageMap, defaultListUUID);

    // Extract unique locales from the map values
    const uniqueLanguages = [...new Set(listLanguageMap.values())];

    const catalogs = await getCatalogs(bringApi, uniqueLanguages);

    return {
      listInfosWithItems,
      catalogs,
    };
  } catch (error) {
    console.error("Failed to fetch lists", error);
    showFailureToast(error, { title: "Failed to fetch lists" });
    throw error; // let the AI know that this tool failed. Throwing the error gives it the full context.
  }
}

async function getCurrentListsAndTheirItems(
  bringApi: BringAPI,
  listLanguageMap: Map<string, string>,
  defaultListUUID: string | null,
): Promise<ListInfoWithItems[]> {
  const lists = (await bringApi.getLists()).lists;
  const listsAndItems = await Promise.all(
    lists.map(async (list) => {
      try {
        const listDetail = await bringApi.getList(list.listUuid);
        const customItems = await bringApi.getListCustomItems(list.listUuid);

        return {
          list,
          itemsToPurchase: listDetail.purchase.map((item) => item.name),
          isDefaultList: defaultListUUID === list.listUuid, // Mark the default list
          language: listLanguageMap.get(list.listUuid) || "en-US",
          customCatalogItems: customItems.map((item) => item.itemId),
        };
      } catch (error) {
        showFailureToast("Failed to fetch list data");
        return {
          list,
          itemsToPurchase: [],
          isDefaultList: defaultListUUID === list.listUuid, // Mark the default list
          language: listLanguageMap.get(list.listUuid) || "en-US",
          customCatalogItems: [],
        };
      }
    }),
  );

  return listsAndItems;
}

async function getCatalogs(bringApi: BringAPI, languages: string[]): Promise<BringCatalog[]> {
  const catalogs: BringCatalog[] = [];

  await Promise.all(
    languages.map(async (lang) => {
      try {
        const catalog = await bringApi.getCatalog(lang);
        catalogs.push(catalog);
      } catch (error) {
        showFailureToast(`Failed to fetch catalog for language: ${lang}`);
      }
    }),
  );

  return catalogs;
}
