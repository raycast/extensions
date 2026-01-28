import { Icon, Color } from "@raycast/api";
import { nanoid } from "nanoid";
import { getItems, saveItems } from "../storage";
import { Item } from "../types";
import { refreshCommands } from "../utils";

type AddDateInput = {
  /**
   * The name of the date to remember
   */
  name: string;
  /**
   * Optional description or subtitle
   */
  subtitle?: string;
  /**
   * The date in YYYY-MM-DD format
   */
  date: string;
};

/**
 * Add a new date to remember
 */
export default async function addDate(input: AddDateInput) {
  const items = await getItems();

  const newItem: Item = {
    id: nanoid(),
    name: input.name,
    subtitle: input.subtitle || "",
    date: input.date,
    icon: Icon.Calendar,
    color: Color.Blue,
  };

  items.push(newItem);
  await saveItems(items);
  await refreshCommands();

  return {
    success: true,
    message: `Added "${input.name}" on ${input.date}${input.subtitle ? ` (${input.subtitle})` : ""}`,
  };
}
