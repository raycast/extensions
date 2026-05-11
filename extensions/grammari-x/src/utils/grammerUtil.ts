import OpenAI from "openai";
import { ToneType } from "../types";
import { AI } from "@raycast/api";
import { environment } from "@raycast/api";

class OpenAIModule {
  private openai: OpenAI | null = null;

  constructor(apiKey: string | null) {
    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  async fixGrammer(inputText: string): Promise<string> {
    const prompt = `The following text has grammar mistakes and is in its original language. Please correct the grammar mistakes without translating it: "${inputText}" and return only the corrected version without any context`;
    return await this.aiRequest(prompt);
  }

  async paraphraseGrammer(inputText: string): Promise<string> {
    const prompt = `Please paraphrase the following sentence in its original language without translating it: "${inputText}" and return only the paraphrased version without any context`;
    return await this.aiRequest(prompt);
  }

  async changeTone(inputText: string, toneType: ToneType) {
    const prompt = `Transform the following sentence to have a "${toneType}" tone, but keep it in its original language: "${inputText}" and return only the transformed version without any context`;
    return await this.aiRequest(prompt);
  }

  async continueText(inputText: string) {
    const prompt = `Based on the following information in its original language, continue the text: "${inputText}" and return only the continued version without any context`;
    return await this.aiRequest(prompt);
  }

  private async aiRequest(prompt: string): Promise<string> {
    if (environment.canAccess(AI)) return await this.raycastAiRequest(prompt);
    else if (this.openai != null) return await this.gptRequest(prompt);
    else throw new Error("AI module not initialized");
  }
  private async gptRequest(prompt: string): Promise<string> {
    const response = await this.openai?.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-5-nano",
    });

    return response?.choices[0]?.message.content ? this.trimQuotes(response.choices[0]?.message.content) : "";
  }

  private async raycastAiRequest(prompt: string): Promise<string> {
    const answer = await AI.ask(prompt);
    return this.trimQuotes(answer);
  }

  private trimQuotes: (input: string) => string = (input) => {
    const regex = new RegExp(`^${'"'}|${'"'}$`, "g");
    return input.replace(regex, "");
  };
}

export { OpenAIModule };
