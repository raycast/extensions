import fetch from "node-fetch";
import { Jurisprudence } from "./types";

export interface LLMPreferences {
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  mistralApiKey?: string;
  mistralModel?: string;
  defaultLlm?: string;
}

export type LLMProvider = "openai" | "anthropic" | "gemini" | "mistral";

export class LLMService {
  private preferences: LLMPreferences;

  constructor(preferences: LLMPreferences) {
    this.preferences = preferences;
  }

  private getPrompt(jurisprudence: Jurisprudence): string {
    return `
Você é um especialista em Direito brasileiro. Analise o seguinte julgado e crie um resumo executivo estruturado:

**Tribunal:** ${jurisprudence.court_code}
**Relator:** ${jurisprudence.trier || "N/A"}
**Data:** ${jurisprudence.order_date ? new Date(jurisprudence.order_date).toLocaleDateString("pt-BR") : "N/A"}
**Processo:** ${jurisprudence.cnj_unique_number || "N/A"}

**Ementa:**
${jurisprudence.headnote || "N/A"}

${jurisprudence.full_text ? `**Inteiro Teor:**\n${jurisprudence.full_text.substring(0, 3000)}...` : ""}

Por favor, forneça um resumo executivo com:

1. **Tema Principal:** Qual a questão jurídica central
2. **Tese Jurídica:** Principal entendimento firmado
3. **Base Legal:** Legislação, súmulas, precedentes e jurisprudência citados
4. **Fundamentos:** Principais argumentos utilizados pelo tribunal
5. **Pontos Controvertidos:** Questões em debate ou divergências identificadas
6. **Resultado:** Como o tribunal decidiu
7. **Relevância Prática:** Implicações para casos similares
8. **Palavras-chave:** 5-8 termos jurídicos relevantes

Mantenha o resumo conciso (máximo 600 palavras) e focado nos aspectos mais práticos e relevantes para advogados.
    `;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.preferences.openaiApiKey) {
      throw new Error("Chave da API OpenAI não configurada");
    }

    const model = this.preferences.openaiModel || "gpt-5-mini-2025-08-07";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.preferences.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em Direito brasileiro que cria resumos executivos de jurisprudência de forma clara e objetiva.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 3000,
        temperature: 1,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      console.error("Erro OpenAI Response:", error);
      throw new Error(
        `Erro OpenAI (${response.status}): ${error.error?.message || response.statusText}`
      );
    }

    const data = (await response.json()) as any;
    console.log("OpenAI Response Data:", JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content;
    const finishReason = data.choices?.[0]?.finish_reason;
    console.log("OpenAI Content Extracted:", content);
    console.log("OpenAI Finish Reason:", finishReason);

    if (!content || content.trim() === "") {
      if (finishReason === "length") {
        console.error(
          "OpenAI atingiu limite de tokens - provavelmente usando todos para reasoning"
        );
        return "Erro: O modelo atingiu o limite de tokens. Tente com um prompt mais curto ou use outro modelo.";
      }
      console.error("OpenAI retornou resposta vazia:", data);
      return "Erro: OpenAI retornou resposta vazia";
    }

    return content;
  }

  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.preferences.anthropicApiKey) {
      throw new Error("Chave da API Anthropic não configurada");
    }

    const model = this.preferences.anthropicModel || "claude-sonnet-4-20250514";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.preferences.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 3000,
        system:
          "Você é um especialista em Direito brasileiro que cria resumos executivos de jurisprudência de forma clara e objetiva.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(`Erro Anthropic: ${error.error?.message || response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.content[0]?.text || "Erro ao gerar resumo";
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.preferences.geminiApiKey) {
      throw new Error("Chave da API Google Gemini não configurada");
    }

    const model = this.preferences.geminiModel || "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.preferences.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Você é um especialista em Direito brasileiro que cria resumos executivos de jurisprudência de forma clara e objetiva.\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 3000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = (await response.json()) as any;
      console.error("Erro Gemini Response:", error);
      throw new Error(`Erro Gemini: ${error.error?.message || response.statusText}`);
    }

    const data = (await response.json()) as any;
    console.log("Gemini Response Data:", JSON.stringify(data, null, 2));

    // Verificar múltiplas estruturas possíveis de resposta
    let content = null;
    const finishReason = data.candidates?.[0]?.finishReason;

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      content = data.candidates[0].content.parts[0].text;
    } else if (data.candidates?.[0]?.output) {
      content = data.candidates[0].output;
    } else if (data.text) {
      content = data.text;
    } else if (data.content?.[0]?.text) {
      content = data.content[0].text;
    }

    if (!content) {
      if (finishReason === "MAX_TOKENS") {
        console.error("Gemini atingiu limite de tokens - provavelmente usando todos para thinking");
        return "Erro: O modelo atingiu o limite de tokens. Tente com um prompt mais curto ou use outro modelo.";
      }
      console.error("Estrutura de resposta Gemini não reconhecida:", data);
      return "Erro: Resposta do Gemini em formato não reconhecido";
    }

    return content;
  }

  private async callMistral(prompt: string): Promise<string> {
    if (!this.preferences.mistralApiKey) {
      throw new Error("Chave da API Mistral não configurada");
    }

    const model = this.preferences.mistralModel || "mistral-medium-2508";

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.preferences.mistralApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em Direito brasileiro que cria resumos executivos de jurisprudência de forma clara e objetiva.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      console.error("Erro Mistral Response:", error);
      throw new Error(`Erro Mistral: ${error.message || response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.choices[0]?.message?.content || "Erro ao gerar resumo";
  }

  async summarizeJurisprudence(
    jurisprudence: Jurisprudence,
    provider?: LLMProvider
  ): Promise<string> {
    const selectedProvider = provider || (this.preferences.defaultLlm as LLMProvider) || "openai";
    const prompt = this.getPrompt(jurisprudence);

    try {
      console.log(`Tentando resumir com ${selectedProvider}`);
      switch (selectedProvider) {
        case "openai":
          return await this.callOpenAI(prompt);
        case "anthropic":
          return await this.callAnthropic(prompt);
        case "gemini":
          return await this.callGemini(prompt);
        case "mistral":
          return await this.callMistral(prompt);
        default:
          throw new Error("Provedor LLM não suportado");
      }
    } catch (error) {
      console.error(`Erro detalhado ao resumir com ${selectedProvider}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      throw new Error(`Erro ao resumir julgado com ${selectedProvider}: ${errorMessage}`);
    }
  }

  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];

    if (this.preferences.openaiApiKey) providers.push("openai");
    if (this.preferences.anthropicApiKey) providers.push("anthropic");
    if (this.preferences.geminiApiKey) providers.push("gemini");
    if (this.preferences.mistralApiKey) providers.push("mistral");

    return providers;
  }

  hasAnyProvider(): boolean {
    return this.getAvailableProviders().length > 0;
  }

  getProviderName(provider: LLMProvider): string {
    const names = {
      anthropic: this.getModelName("anthropic"),
      gemini: this.getModelName("gemini"),
      openai: this.getModelName("openai"),
      mistral: this.getModelName("mistral"),
    };
    return names[provider];
  }

  getProviderIcon(
    provider: LLMProvider
  ): { source: string } | { source: { light: string; dark: string } } {
    switch (provider) {
      case "openai":
        return {
          source: {
            light: "openai.svg",
            dark: "openai@dark.svg",
          },
        };
      case "anthropic":
        return { source: "anthropic.svg" };
      case "gemini":
        return { source: "gemini.svg" };
      case "mistral":
        return { source: "mistral.svg" };
      default:
        return {
          source: {
            light: "command-icon.png",
            dark: "command-icon@dark.png",
          },
        };
    }
  }

  private getModelName(provider: LLMProvider): string {
    switch (provider) {
      case "anthropic": {
        const anthropicModel = this.preferences.anthropicModel || "claude-sonnet-4-20250514";
        if (anthropicModel.includes("sonnet")) return "Claude Sonnet 4";
        return "Claude Opus 4";
      }
      case "gemini": {
        const geminiModel = this.preferences.geminiModel || "gemini-2.5-flash";
        return geminiModel.includes("flash") ? "Gemini 2.5 Flash" : "Gemini 2.5 Pro";
      }
      case "openai": {
        const openaiModel = this.preferences.openaiModel || "gpt-5-mini-2025-08-07";
        if (openaiModel.includes("gpt-5-mini")) return "GPT-5 Mini";
        if (openaiModel.includes("gpt-4.1")) return "GPT-4.1";
        return "GPT-5";
      }
      case "mistral": {
        const mistralModel = this.preferences.mistralModel || "mistral-medium-2508";
        return mistralModel.includes("medium") ? "Mistral Medium 3.1" : "Mistral Small 2.1";
      }
      default:
        return "Desconhecido";
    }
  }
}
