import OnePasswordMetaItem from "./OnePasswordMetaItem.dto";

export default class OnePasswordMetaItemsCategory {
  categoryPluralName: string;
  categoryUUID: string;
  metaItems: OnePasswordMetaItem[];

  constructor(categoryPluralName: string, categoryUUID: string, metaItems: OnePasswordMetaItem[]) {
    this.categoryPluralName = categoryPluralName;
    this.categoryUUID = categoryUUID;
    this.metaItems = metaItems;
  }
}
