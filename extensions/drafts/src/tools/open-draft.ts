import { CallbackUrl } from "../utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "../utils/Defines";
import { getDrafts } from "../utils/get-drafts";

type Input = {
  /**
   * The uuid of the draft to open.
   */
  uuid: string;
};

export default async function (input: Input) {
  const drafts = await getDrafts();

  const draftToOpen = drafts.filter((draft) => draft.uuid === input.uuid);

  if (draftToOpen.length != 1) {
    return false;
  }

  const callbackUrl = new CallbackUrl(CallbackBaseUrls.OPEN_DRAFT);
  callbackUrl.addParam({ name: "uuid", value: input.uuid });
  await callbackUrl.openCallbackUrl();
  return true;
}
