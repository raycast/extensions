import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import * as alias from "./api/alias";

const GenerateAlias = async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating Alias",
  });

  try {
    const newAliasEmail = await alias.create();

    if (newAliasEmail.id?.length > 0) {
      Clipboard.copy(newAliasEmail.email);
      await showHUD("✅ Alias copied to clipboard");
    } else {
      await showHUD("❌ Alias could not be generated");
    }
  } catch (error) {
    console.log(">>> error", error);
    await showHUD("❌ AnonAddy API credentials are invalid");
  }

  await toast.hide();
};

export default GenerateAlias;
