import { Clipboard, showHUD } from "@raycast/api";
import { createAlias } from "./utils/create";

const GenerateAlias = async () => {
  const newAliasEmail = await createAlias();

  Clipboard.copy(newAliasEmail.email);

  showHUD("Alias copied to clipboard");
};

export default GenerateAlias;
