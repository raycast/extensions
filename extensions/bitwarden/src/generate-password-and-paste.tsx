import { Clipboard, LocalStorage, showToast, Toast } from "@raycast/api";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { DEFAULT_PASSWORD_OPTIONS } from "~/constants/passwords";
import { PasswordGeneratorOptions } from "~/types/passwords";
import { Bitwarden } from "~/api/bitwarden";

const generatePasswordAndPasteCommand = async () => {
  const toast = await showToast(Toast.Style.Animated, "Generating password…");
  try {
    const bitwarden = await new Bitwarden().initialize();
    const storedOptions = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS);
    const options: PasswordGeneratorOptions = {
      ...DEFAULT_PASSWORD_OPTIONS,
      ...(storedOptions ? JSON.parse(storedOptions) : {}),
    };
    const password = await bitwarden.generatePassword(options);
    await Clipboard.copy(password);
    await Clipboard.paste(password);
  } catch {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to generate";
  }
};

export default generatePasswordAndPasteCommand;
