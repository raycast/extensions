import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { generateCnpj } from "../../core/cnpj/generate-cnpj";

export class GenerateCnpj {
  public name = "Generate CNPJ";

  public async action(): Promise<void> {
    await Clipboard.copy(generateCnpj());
    await showHUD("CNPJ copied to clipboard ⌘c");
    await closeMainWindow();
  }
}

export class GenerateCnpjFormatted {
  public name = "Generate CNPJ (formatted)";

  public async action(): Promise<void> {
    await Clipboard.copy(generateCnpj({ format: true }));
    await showHUD("CNPJ (formatted) copied to clipboard ⌘c");
    await closeMainWindow();
  }
}
