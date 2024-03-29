export const ErrorRaycastModelNotConfiguredOnLocalStorage = new Error(
  "Preferred model is not configured on LocalStorage."
);
export const ErrorOllamaVersion = new Error("Ollama version not supported, update at least at v0.1.14.");
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

export class ErrorOllamaModelNotMultimodal extends Error {
  public readonly model?: string;
  public readonly suggest?: string;

  constructor(message: string, model?: string) {
    super(message);
    this.model = model;
    this.suggest = `Select a different model with multimodal capabilities`;
  }
}
