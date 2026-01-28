import { Toast, showToast, Clipboard } from "@raycast/api";
import { validateLinkInput } from "./utils/validation";
import { requestAddMagnet, requestLinkUnrestrict } from "./api";
import { LinkType } from "./schema";

const getStartMessage = (type: LinkType) => {
  switch (type) {
    case "link":
      return "Sending link to Real-Debrid";
    case "magnet":
      return "Sending magnet to Real-Debrid";
    default:
      return "";
  }
};
const getSuccessMessage = (type: LinkType) => {
  switch (type) {
    case "link":
      return "Link added successfully";
    case "magnet":
      return "Magnet added! Check UI for further actions";
    default:
      return "";
  }
};

export const addFromClipboard = async () => {
  const link = (await Clipboard.readText()) as string;
  const { type, valid } = validateLinkInput(link);
  if (!valid || !type) {
    await showToast(Toast.Style.Failure, `Not a valid URL or magnet`);
    return;
  }
  await showToast(Toast.Style.Animated, getStartMessage(type));

  try {
    switch (type) {
      case "link":
        await requestLinkUnrestrict(link);
        break;
      case "magnet":
        await requestAddMagnet(link);
        break;
    }

    await showToast(Toast.Style.Success, getSuccessMessage(type));
  } catch (e) {
    await showToast(Toast.Style.Failure, e as string);
  }
  return;
};

export default addFromClipboard;
