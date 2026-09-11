// fallow-ignore-next-line unresolved-import
import { Color, Icon } from "@raycast/api";
import { getCategories } from "./api/client";
import { getFigaCategoriesUrl, getFigaCategoryUrl } from "./api/links";
import type { FigaCategory, FigaCategoryListResponse } from "./api/types";
import { ReferenceListCommand, type ReferenceCommandConfig } from "./reference-list-command";

const CATEGORY_CONFIG: ReferenceCommandConfig<FigaCategory, FigaCategoryListResponse> = {
  resource: "categories",
  title: "Search Categories",
  itemName: "Category",
  pluralName: "Categories",
  icon: Icon.Folder,
  fetch: getCategories,
  getItems: (response) => response.categories,
  getListUrl: getFigaCategoriesUrl,
  getItemUrl: (workspaceId, item) => getFigaCategoryUrl(workspaceId, item.id),
  getItemIcon: (item) => ({
    source: Icon.CircleFilled,
    tintColor: item.color ?? Color.SecondaryText,
  }),
};

export default function Command() {
  return <ReferenceListCommand config={CATEGORY_CONFIG} />;
}
