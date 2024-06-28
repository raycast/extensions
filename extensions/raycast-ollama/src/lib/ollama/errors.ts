export const OllamaMessageModelNotInstalled = "Model is not Installed.";

export const OllamaVersion = new Error("Ollama version not supported, update at least at v0.1.14.");
export const OllamaNotInstalledOrRunning = new Error("Verify Ollama is Installed and Currently Running.");
export const OllamaModelRegistryUnreachable = new Error("Ollama Models Registry is Unreachable.");

export class OllamaCustomModel extends Error {
  public readonly model?: string;
  public readonly file?: string;

  constructor(message: string, model?: string, file?: string) {
    super(message);
    this.model = model;
    this.file = file;
  }
}

export class OllamaModelNotInstalled extends Error {
  public readonly model?: string;
  public readonly suggest?: string;

  constructor(message: string, model?: string) {
    super(message);
    this.model = model;
    this.suggest = `Select a different model or install throw 'Manage Models' command`;
  }
}

export class OllamaModelNotMultimodal extends Error {
  public readonly model?: string;
  public readonly suggest?: string;

  constructor(message: string, model?: string) {
    super(message);
    this.model = model;
    this.suggest = `Select a different model with multimodal capabilities`;
  }
}
