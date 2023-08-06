export const ErrorRaycastApiNoTextSelected = new Error("You Need to Select a Text for This Command.");
export const ErrorOllamaNotInstalledOrRunning = new Error("Verify Ollama is Installed and Currently Running.");
export const ErrorOllamaCantCreateCustomModel = new Error("Something Goes Wrong Creating Custom Model");
export const MessageOllamaModelNotInstalled = new Error("Base Model is not Installed.");

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
    this.suggest = `Run 'ollama pull ${model}' for install it.`;
  }
}
