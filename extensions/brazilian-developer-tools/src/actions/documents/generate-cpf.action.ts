import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { generateCpf } from "../../core/cpf/generate-cpf";

export class GenerateCpf {
  public name = "Generate CPF";

  public async action(): Promise<void> {
    await Clipboard.copy(generateCpf());
    await showHUD("CPF copied to clipboard ⌘c");
    await closeMainWindow();
  }
}

export class GenerateCpfFormatted {
  public name = "Generate CPF (formatted)";

  public async action(): Promise<void> {
    await Clipboard.copy(generateCpf({ format: true }));
    await showHUD("CPF formatted copied to clipboard ⌘c");
    await closeMainWindow();
  }
}
