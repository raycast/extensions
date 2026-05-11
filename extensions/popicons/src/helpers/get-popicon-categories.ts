import { Popicon } from "../schemas/popicon";

export type PopIconCategory = {
  title: string;
  icons: Array<Popicon>;
  keywords: Array<string>;
};

export function getPopiconCategories(icons: Array<Popicon>): Array<PopIconCategory> {
  if (icons.length === 0) return [];

  const categoryTitles = Array.from(new Set(icons.map((icon) => icon.category)));

  const categories: Array<PopIconCategory> = categoryTitles.map((category) => {
    return {
      title: category,
      icons: icons?.filter((icon) => icon.category === category),
      keywords: [category],
    };
  });

  return categories;
}
