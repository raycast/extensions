import type { Emoticon, EmoticonCategory } from "../types/emoticons";

const allCategoriesSlug = "all";
const fieldName = "name";

const filterByText = <T>(
  elements: T[],
  fieldName: string,
  searchText: string,
) => {
  return searchText === ""
    ? elements
    : elements.filter((element) =>
        (element as Record<string, string>)[fieldName]
          .toLowerCase()
          .includes(searchText),
      );
};

// - convert emoticons to a flat array
// - filter by category and emoticon description
// - return alphabetically sorted array of emoticons
export const getEmoticons = (
  emoticons: EmoticonCategory[],
  categorySlug: string = allCategoriesSlug,
  searchText: string = "",
) => {
  const filteredByCategory = emoticons.reduce<Emoticon[]>(
    (acc, category: EmoticonCategory) => {
      if (![allCategoriesSlug, category.slug].includes(categorySlug)) {
        return acc;
      }

      category.emoticons.forEach((emoticon) => {
        acc.push(emoticon);
      });

      return acc;
    },
    [],
  );

  const filteredByText = filterByText<Emoticon>(
    filteredByCategory,
    fieldName,
    searchText,
  );

  return filteredByText.sort((a, b) => (a.name > b.name ? 1 : -1));
};
