import { Clipboard, showHUD, showToast, Toast, open } from "@raycast/api";
import { createAlias } from "./utils/create";
interface creationResponse {
  email: string;
  message?: string;
  messageLinkTitle?: string;
  messageLink?: string;
}
const Generate = async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating Email...",
  });

  const res = await createAlias();
  if (res.status === 401) {
    await showHUD(
      "❌ HideMail API credentials are invalid. Create new API Token and update it on Raycast extension preferences",
    );
    await open("https://hidemail.app/user/api-tokens?source=raycast");
    return false;
  }
  const data = (await res.json()) as creationResponse;

  const newAliasEmail = data;

  if (newAliasEmail?.message) {
    if (newAliasEmail?.messageLink) {
      await showHUD(newAliasEmail?.message + " " + newAliasEmail?.messageLinkTitle);
      await open(newAliasEmail?.messageLink);
    } else {
      await showHUD(newAliasEmail?.message);
      await open("https://hidemail.app/dashboard?source=raycast");
    }

    await toast.hide();
    return;
  }

  if (newAliasEmail?.email) {
    await Clipboard.copy(newAliasEmail.email);
    await showHUD("✅ Copied email to clipboard!");
  } else {
    let error = "Unknown error";
    if (data?.message) {
      error = data.message;
    }
    await showHUD("❌ Email could not be generated. " + error);
  }

  await toast.hide();
};

export default Generate;
