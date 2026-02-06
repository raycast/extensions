import { Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getBringApi } from "../lib/bringService";

type Input = {
  /**
   * The list to add the items to.
   */
  list: {
    name: string;
    listUuid: string;
  };
  /**
   * The items to add to the list.
   */
  items: {
    /**
     * Use the itemId from the list catalog whenever available for standard items. For custom items, the 'name' field will be used.
     * The 'specification' field is optional and should only be used to add relevant details for shopping, such as quantity, brand, or product attributes (e.g., "2% fat" for milk, "organic" for apples, "500g" for pasta).
     * This helps clarify exactly what should be purchased and avoids ambiguity in the shopping list.
     */
    name: string;
    itemId?: string; // Use itemId matching the catalog whenever possible for standard catalog items (they are usually in German)
    specification?: string;
  }[];
};

export default async function tool(input: Input) {
  try {
    const bringApi = await getBringApi();

    await Promise.all(
      input.items.map(({ itemId, name, specification }) =>
        bringApi.addItemToList(input.list.listUuid, itemId || name, specification),
      ),
    );
  } catch (error) {
    console.error("Failed to add item", error);
    showFailureToast(error, { title: "Failed to add item" });
    throw error; // let the AI know that this tool failed. Throwing the error gives it the full context.
  }
}

export const confirmation: Tool.Confirmation<Input> = async ({ items, list }) => {
  console.log("Adding items to list", { items, list });
  if (items.length === 0) {
    return {
      message: `No items to add to the "${list.name}" list.`,
    };
  } else if (items.length === 1) {
    const { name, specification } = items[0];
    const itemText = specification ? `${name}: ${specification}` : name;
    return {
      message: `Okay, let's add **${itemText}** to the **${list.name}** list?`,
    };
  } else {
    const markdownList = items
      .map(({ name, specification }) => `- **${name}**${specification ? `: ${specification}` : ""}`)
      .join("\n");
    return {
      message: `Okay, let's add the following items to the "${list.name}" list?\n\n${markdownList}`,
    };
  }
};
