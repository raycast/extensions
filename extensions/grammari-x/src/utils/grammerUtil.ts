import OpenAI from "openai";
import { AIProvider, ToneType } from "../types";
import { getAIProvider } from "../utils";
import { cleanOutput } from "./cleanOutput";
import { logDebug } from "./debugLog";
import { AIRequest, changeTonePrompt, continueTextPrompt, fixGrammarPrompt, paraphrasePrompt } from "./prompts";
import { AI } from "@raycast/api";
import { environment } from "@raycast/api";

class OpenAIModule {
  private openai: OpenAI | null = null;

  constructor(apiKey: string | null) {
    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  async fixGrammer(inputText: string): Promise<string> {
    return await this.aiRequest(fixGrammarPrompt(inputText));
  }

  async paraphraseGrammer(inputText: string): Promise<string> {
    return await this.aiRequest(paraphrasePrompt(inputText));
  }

  async changeTone(inputText: string, toneType: ToneType) {
    return await this.aiRequest(changeTonePrompt(inputText, toneType));
  }

  async continueText(inputText: string) {
    return await this.aiRequest(continueTextPrompt(inputText));
  }

  private async aiRequest(request: AIRequest): Promise<string> {
    const provider = getAIProvider();
    const canUseRaycastAI = environment.canAccess(AI);
    const canUseOpenAI = this.openai != null;

    const raycastProvider = { name: "Raycast AI", run: () => this.raycastAiRequest(request) };
    const openAIProvider = { name: "OpenAI", run: () => this.gptRequest(request) };

    // Ordered by preference. In Auto, a configured OpenAI key wins: canAccess(AI) stays
    // true once Raycast AI credits are spent, and Raycast shows its own "no credits"
    // message as soon as AI.ask is called, so the key has to be used instead of after.
    const raycastFirst = provider === AIProvider.RaycastAI || (provider === AIProvider.Auto && !canUseOpenAI);
    const preferred = raycastFirst ? [raycastProvider, openAIProvider] : [openAIProvider, raycastProvider];
    const providers = preferred.filter((candidate) => (candidate === openAIProvider ? canUseOpenAI : canUseRaycastAI));

    const context = `preference=${provider} canUseRaycastAI=${canUseRaycastAI} hasOpenAIKey=${canUseOpenAI}`;

    if (provider === AIProvider.OpenAI && !canUseOpenAI) {
      throw new Error("OpenAI is selected as the AI provider but no OpenAI access token is set in the preferences");
    }

    if (providers.length === 0) throw new Error("AI module not initialized");

    const failures: string[] = [];
    for (const candidate of providers) {
      try {
        const answer = await candidate.run();
        if (answer.trim()) return answer;
        logDebug(`${candidate.name} returned an empty response (${context})`);
        failures.push(`${candidate.name}: empty response`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logDebug(`${candidate.name} request failed: ${message} (${context})`);
        failures.push(`${candidate.name}: ${message}`);
      }
    }

    throw new Error(failures.join(" | "));
  }

  private async gptRequest(request: AIRequest): Promise<string> {
    const response = await this.openai?.chat.completions.create({
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      model: "gpt-5.6-luna",
      // Per action: spotting that a verb cannot take the object it was given needs more
      // thought than restyling a sentence does. The cheapest tier reasoning beats a
      // pricier one guessing, so effort is the lever to reach for before the model tier.
      reasoning_effort: request.reasoning,
    });

    const content = response?.choices[0]?.message.content;
    return content ? cleanOutput(content) : "";
  }

  private async raycastAiRequest(request: AIRequest): Promise<string> {
    // AI.ask takes a single prompt, so the rules are prepended to the text itself.
    const answer = await AI.ask(`${request.system}\n\n${request.user}`, { creativity: request.creativity });
    return cleanOutput(answer);
  }
}

export { OpenAIModule };
