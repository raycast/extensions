export default class OnePasswordMetaItem {
  uuid: string;
  itemDescription: string;
  itemTitle: string;
  vaultName: string;
  vaultUUID: string;
  categoryPluralName: string;
  modifiedAt: number;
  profileUUID: string;
  websiteURLs: string[];
  categorySingularName: string;
  categoryUUID: string;
  accountName?: string;
  createdAt: number;

  constructor(metaItem: any) {
    this.uuid = metaItem.uuid;
    this.itemDescription = metaItem.itemDescription;
    this.itemTitle = metaItem.itemTitle;
    this.vaultName = metaItem.vaultName;
    this.vaultUUID = metaItem.vaultUUID;
    this.categoryPluralName = metaItem.categoryPluralName;
    this.modifiedAt = metaItem.modifiedAt;
    this.profileUUID = metaItem.profileUUID;
    this.websiteURLs = metaItem.websiteURLs;
    this.categorySingularName = metaItem.categorySingularName;
    this.categoryUUID = metaItem.categoryUUID;
    this.accountName = metaItem.accountName;
    this.createdAt = metaItem.createdAt;
  }
}
