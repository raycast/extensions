import { Section } from "../components/ItemsGrid";
import { BringAPI, BringCatalog, BringCustomItem, BringList, Translations } from "./bringAPI";
import { getIconPlaceholder, getImageUrl } from "./helpers";

export function getSections(bringApi: BringAPI, listUuid: string, locale: string): Promise<Section[]> {
  return Promise.all([
    bringApi.getCatalog(locale),
    bringApi.getList(listUuid),
    bringApi.getListCustomItems(listUuid),
    bringApi.getTranslations(locale),
  ]).then(([catalog, list, customItems, translations]) =>
    getSectionsFromData(catalog, list, customItems, translations),
  );
}

export function getListData(bringApi: BringAPI, listUuid: string): Promise<[BringList, BringCustomItem[]]> {
  return Promise.all([bringApi.getList(listUuid), bringApi.getListCustomItems(listUuid)]);
}

export function getTranslationsData(bringApi: BringAPI, locale: string): Promise<[BringCatalog, Translations]> {
  return Promise.all([bringApi.getCatalog(locale), bringApi.getTranslations(locale)]);
}

export function getSectionsFromData(
  catalog?: BringCatalog,
  listDetail?: BringList,
  customItems?: BringCustomItem[],
  translations?: Translations,
): Section[] {
  if (!catalog || !listDetail || !customItems || !translations) return [];

  let sections: Section[] = catalog.catalog.sections.map((section) => ({
    name: section.name,
    sectionId: section.sectionId,
    items: section.items
      .filter(
        // remove item if there is a custom item with the same name and another section name
        ({ itemId }) =>
          !customItems.find((customItem) => customItem.itemId === itemId && customItem.userSectionId !== section.name),
      )
      .map(({ itemId, name }) => ({
        itemId,
        name,
        image: getImageUrl(itemId),
        fallback: getIconPlaceholder(name),
        isInPurchaseList: listDetail.purchase.some((p) => p.name === itemId),
        specification: listDetail.purchase.find((p) => p.name === itemId)?.specification,
      })),
  }));

  sections = addCustomItemsToSections(sections, listDetail, customItems, translations);

  return sections.map((section) => ({
    ...section,
    items: section.items.sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

function addCustomItemsToSections(
  sections: Section[],
  list: BringList,
  customItems: BringCustomItem[],
  translations: Translations,
): Section[] {
  // add items from purchase list if there are not yet in any section
  list.purchase
    .filter(
      // ignore item if there is a custom item with the same name
      ({ name }) => !customItems.find((customItem) => customItem.itemId === name),
    )
    .forEach((listItem) => {
      const section = sections.find((section) => section.items.some((item) => item.itemId === listItem.name));
      if (!section) {
        const customSection = getOrCreateCustomSection(sections, translations);
        customSection?.items.push({
          itemId: listItem.name,
          name: listItem.name,
          image: getImageUrl(listItem.name),
          fallback: getIconPlaceholder(listItem.name),
          isInPurchaseList: true,
          specification: listItem.specification,
        });
      }
    });

  // go through all custom items and replace items when they have matching section and name
  customItems.forEach((customItem) => {
    const section = sections.find((section) => section.sectionId === customItem.userSectionId);
    const item = section?.items.find((item) => item.name === customItem.itemId);
    if (item) {
      // replace item
      item.image = customItem.userIconItemId ? getImageUrl(customItem.userIconItemId) : getImageUrl(customItem.itemId);
    } else if (section) {
      // add item in exiting section
      section?.items.push({
        itemId: customItem.itemId,
        name: translations[customItem.itemId] || customItem.itemId,
        image: customItem.userIconItemId ? getImageUrl(customItem.userIconItemId) : getImageUrl(customItem.itemId),
        fallback: getIconPlaceholder(customItem.itemId),
        isInPurchaseList: list.purchase.some((p) => p.name === customItem.itemId),
        specification: list.purchase.find((p) => p.name === customItem.itemId)?.specification,
      });
    } else {
      // add item in custom section
      const customSection = getOrCreateCustomSection(sections, translations);
      const existingCustomItem = customSection.items.find((item) => item.name === customItem.itemId);
      if (existingCustomItem) {
        existingCustomItem.image = customItem.userIconItemId
          ? getImageUrl(customItem.userIconItemId)
          : getImageUrl(customItem.itemId);
      } else {
        customSection?.items.push({
          itemId: customItem.itemId,
          name: translations[customItem.itemId] || customItem.itemId,
          image: customItem.userIconItemId ? getImageUrl(customItem.userIconItemId) : getImageUrl(customItem.itemId),
          fallback: getIconPlaceholder(customItem.itemId),
          isInPurchaseList: list.purchase.some((p) => p.name === customItem.itemId),
          specification: list.purchase.find((p) => p.name === customItem.itemId)?.specification,
        });
      }
    }
  });

  return sections;
}

export function getOrCreateCustomSection(sections: Section[], translations: Translations): Section {
  const customSectionName = translations["Eigene Artikel"];
  let customSection = sections.find((section) => section.sectionId === customSectionName);
  if (!customSection) {
    customSection = {
      name: customSectionName,
      sectionId: customSectionName,
      items: [],
    };
    sections.push(customSection);
  }
  return customSection;
}
