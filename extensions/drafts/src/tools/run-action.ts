import { Tool } from "@raycast/api";
import { CallbackUrl } from "../utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "../utils/Defines";
import { getAllActions } from "../utils/get-all-actions";

type Input = {
  /**
   * The name of the action.
   */
  actionName: string;
  /**
   * The input text for the action.
   *
   * - text is optional
   */
  text?: string;
};

export default async function (input: Input) {
  const actions = await getAllActions();
  const actionToRun = actions.filter((action) => action.name === input.actionName);

  if (actionToRun.length != 1) {
    return false;
  }

  const callbackUrl = new CallbackUrl(CallbackBaseUrls.RUN_ACTION);
  callbackUrl.addParam({ name: "action", value: input.actionName });
  if (input.text) {
    callbackUrl.addParam({ name: "text", value: input.text });
  }
  await callbackUrl.openCallbackUrl();
  return true;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      { name: "Action Name", value: input.actionName },
      { name: "Input Text", value: input.text },
    ],
  };
};
