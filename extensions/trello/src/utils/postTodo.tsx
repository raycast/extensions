import fetch from "node-fetch";
import { getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { postValues, preferences } from "./types";

export const postTodo = async (values: postValues) => {
  const { token, apitoken } = getPreferenceValues<preferences>();

  try {
    await fetch(
      `https://api.trello.com/1/cards?key=${apitoken}&token=${token}&name=${values.name}&due=${values.due}&desc=${values.desc}&idList=${values.idList}&idMembers=${values.idMember}`,
      { method: "POST" },
    );
    showToast({ title: "Success", message: "Your to do was created" });
    popToRoot();
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
    return Promise.resolve([]);
  }
};
