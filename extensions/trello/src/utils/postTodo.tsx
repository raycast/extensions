import fetch from "node-fetch";
import { getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { Preferences } from "@raycast/api/types/core/preferences";

export const postTodo = async (values) => {
  const { token }: Preferences = getPreferenceValues();
  const { apitoken }: Preferences = getPreferenceValues();

  try {
    await fetch(
      `https://api.trello.com/1/cards?key=${apitoken}&token=${token}&name=${values.name}&idList=${values.idList}`,
      { method: "POST" }
    );
    showToast({ title: "Success", message: "Your to do was created" });
    popToRoot();
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
    return Promise.resolve([]);
  }
};
