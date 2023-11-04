export const ErrorRaycastApiNoTextSelectedOrCopied = new Error(
  "You Need to Select a Text or Copied on Clipboard for This Command."
);
export const ErrorRaycastApiNoTextSelected = new Error("You Need to Select a Text for This Command.");
export const ErrorRaycastApiNoTextCopied = new Error("You Need to Copy Text on Clipboard for This Command.");
export const ErrorOllamaNotInstalledOrRunning = new Error("Verify Ollama is Installed and Currently Running.");
export const ErrorOllamaModelRegistryUnreachable = new Error("Ollama Models Registry is Unreachable.");
export const MessageOllamaModelNotInstalled = new Error("Model is not Installed.");

export class ErrorOllamaCustomModel extends Error {
  public readonly model?: string;
  public readonly file?: string;

  constructor(message: string, model?: string, file?: string) {
    super(message);
    this.model = model;
    this.file = file;
  }
}

export class ErrorOllamaModelNotInstalled extends Error {
  public readonly model?: string;
  public readonly suggest?: string;

  constructor(message: string, model?: string) {
    super(message);
    this.model = model;
    this.suggest = `Select a different model or install throw 'Manage Models' command`;
  }
}
