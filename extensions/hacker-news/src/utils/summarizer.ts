import OpenAI from "openai";
import { AI } from "@raycast/api";
import { environment } from "@raycast/api";

class OpenAIModule {
  private openai: OpenAI | null = null;

  constructor(apiKey: string) {
    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  async summarizeArticle(url: string): Promise<string> {
    const prompt = `Please summarize the article and provide only a short summary with a title using markdown. ${url}`;
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
      model: "gpt-3.5-turbo",
      temperature: 0.5,
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
