import { popToRoot, showToast, Toast } from "@raycast/api";
import { postValues } from "./types";
import { trelloClient } from "./trelloClient";

export const postCard = async (values: postValues) => {
  try {
    await trelloClient.createCard({
      name: values.name,
      desc: values.desc,
      due: values.due ? new Date(values.due) : null,
      idList: values.idList,
      idMembers: values.idMember,
    });
    showToast({ title: "Success", message: "Your card was created" });
    popToRoot();
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not create card, check your credentials");
    return Promise.resolve([]);
  }
};
