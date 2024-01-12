import { GifGridSectionProps } from "../components/GifGridSection";

export function getItemId(section: string, id: string) {
  return `${section}/${id}`;
}

function parseItemId(itemId: string): [section: string, id: string] {
  const [section, id] = itemId.split("/");
  return [section, id];
}

/**
 * Determines whether more items should be loaded.
 *
 * If the selected item is in the trending section (also search) and is in the last row, more items should be loaded.
 */
export function shouldLoadMore(selectedItemId: string, sections: GifGridSectionProps[], columns: number): boolean {
  const [selectedSection, selectedId] = parseItemId(selectedItemId);
  if (selectedSection !== "Trending" || !selectedId) return false;

  const trendingSection = sections[sections.length - 1];
  if (trendingSection.results === undefined) return false;

  const lastRowSize = trendingSection.results.length % columns || columns;
  const lastRowItems = trendingSection.results.slice(-lastRowSize);
  const selectedItem = lastRowItems.find((gif) => gif.id === selectedId);

  return selectedItem !== undefined;
}
