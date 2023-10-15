import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { createAlias } from "./utils/create";

const GenerateAlias = async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating Alias",
  });

  const newAliasEmail = await createAlias();
  if (newAliasEmail.id?.length > 0) {
    Clipboard.copy(newAliasEmail.email);
    await showHUD("✅ Alias copied to clipboard");
  } else {
    await showHUD("❌ Alias could not be generated");
  }

  await toast.hide();
};

export default GenerateAlias;
