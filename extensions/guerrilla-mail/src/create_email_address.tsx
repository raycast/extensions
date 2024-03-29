import { LocalStorage, LaunchProps, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { SET_EMAIL_ADDRESS } from "./utils/endPoints";
import { api } from "./utils/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CreateEmailAddress }>) {
  await showToast(Toast.Style.Animated, "Generating email...");

  const { email } = props.arguments;

  try {
    const emailAddress = await api
      .get(`${SET_EMAIL_ADDRESS}&email_user=${email.indexOf("@") >= 0 ? email.slice(0, email.indexOf("@")) : email}`)
      .then((response) => {
        return response.data.email_addr;
      });
    const emailStore = await LocalStorage.getItem<string>("emails");
    const emails = emailStore ? JSON.parse(emailStore) : [];

    await Clipboard.copy(emailAddress);
    await LocalStorage.setItem("emails", JSON.stringify(Array.from(new Set([emailAddress, ...emails]))));
    await showHUD(`✅ Copied ${emailAddress} to clipboard`);
  } catch (error) {
    await showHUD("❌ Failed to generate email");
  }
}
