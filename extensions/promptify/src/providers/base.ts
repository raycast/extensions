import { PresetConfig } from "../core/types";

export interface AIProvider {
  name: string;
  enhance(prompt: string, preset: PresetConfig): Promise<string>;
  isAvailable(): Promise<boolean>;
  getModels?(): Promise<string[]>;
}

export abstract class BaseProvider implements AIProvider {
  abstract name: string;

  abstract enhance(prompt: string, preset: PresetConfig): Promise<string>;
  abstract isAvailable(): Promise<boolean>;

  async getModels(): Promise<string[]> {
    return [];
  }

  protected formatPrompt(userPrompt: string, preset: PresetConfig): string {
    return `${preset.systemPrompt}\n\n${userPrompt}`;
  }
}
