import { LocalStorage, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { GET_EMAIL_ADDRESS } from "./utils/endPoints";
import { api } from "./utils/api";

export default async function Command() {
  await showToast(Toast.Style.Animated, "Generating email...");

  try {
    const emailAddress = await api.get(GET_EMAIL_ADDRESS).then((response) => {
      return response.data.email_addr;
    });

    if (!emailAddress) {
      throw new Error("Failed to generate email");
    }

    const emailStore = await LocalStorage.getItem<string>("emails");
    const emails = emailStore ? JSON.parse(emailStore) : [];

    await Clipboard.copy(emailAddress);
    await LocalStorage.setItem("emails", JSON.stringify([...Array.from(new Set([emailAddress, ...emails]))]));
    await showHUD(`✅ Copied ${emailAddress} to clipboard`);
  } catch (error) {
    await showHUD("❌ Failed to generate email");
  }
}
