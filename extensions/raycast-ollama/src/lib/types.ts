// Use the Raycast auto-generated global `Preferences` to avoid drift
export type Preferences = globalThis.Preferences;

export interface RaycastArgumentsOllamaCommandCustom {
  fallbackText?: string;
  arguments: {
    prompt: string;
    model: string;
    parameters: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastArgumentsOllamaCommandTranslate {
  fallbackText?: string;
  arguments: {
    source: string;
    target: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastImage {
  path: string;
  html: string;
  base64: string;
}
