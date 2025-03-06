import { Tool } from "@raycast/api";
import { getBringApi } from "../lib/bringService";
import { showFailureToast } from "@raycast/utils";

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
  items: string[];
};

export default async function tool(input: Input) {
  try {
    const bringApi = await getBringApi();

    await Promise.all(input.items.map((item) => bringApi.addItemToList(input.list.listUuid, item)));
  } catch (error) {
    console.error("Failed to add item", error);
    showFailureToast(error, { title: "Failed to add item" });
    throw error; // let the AI know that this tool failed. Throwing the error gives it the full context.
  }
}

export const confirmation: Tool.Confirmation<Input> = async ({ items, list }) => {
  if (items.length === 0) {
    return {
      message: `No items to add to the "${list.name}" list.`,
    };
  } else if (items.length === 1) {
    return {
      message: `Okay, let's add "${items[0]}" to the "${list.name}" list?`,
    };
  } else {
    return {
      message: `Okay, let's add the following items to the "${list.name}" list?`,
      info: items.map((value, index) => ({ name: `${index + 1}.`, value })),
    };
  }
};
