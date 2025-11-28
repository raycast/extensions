import { getItems } from "../storage";

type ListDatesInput = {
  /**
   * Optional filter to search dates by name or subtitle
   */
  filter?: string;
};

/**
 * List all remembered dates
 */
export default async function listDates(input: ListDatesInput = {}) {
  const items = await getItems();

  let filteredItems = items;
  if (input.filter) {
    filteredItems = items.filter(
      (item) =>
        item.name.toLowerCase().includes(input.filter!.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(input.filter!.toLowerCase()),
    );
  }

  return {
    success: true,
    count: filteredItems.length,
    items: filteredItems.map((item) => ({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle,
      date: item.date,
    })),
  };
}
