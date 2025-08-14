import fetch from "node-fetch";
import { Jurisprudence } from "./types";
import { LLMPreferences, LLMProvider } from "./llm-service";

export class LLMStreamingService {
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

  async *streamOpenAI(prompt: string): AsyncGenerator<string, void, unknown> {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(
        `Erro OpenAI (${response.status}): ${error.error?.message || response.statusText}`
      );
    }

    const reader = (response.body as any)?.getReader();
    if (!reader) {
      throw new Error("Erro ao inicializar stream OpenAI");
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignorar linhas que não são JSON válido
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *streamAnthropic(prompt: string): AsyncGenerator<string, void, unknown> {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(
        `Erro Anthropic (${response.status}): ${error.error?.message || response.statusText}`
      );
    }

    const reader = (response.body as any)?.getReader();
    if (!reader) {
      throw new Error("Erro ao inicializar stream Anthropic");
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta") {
                const content = parsed.delta?.text;
                if (content) {
                  yield content;
                }
              }
            } catch (e) {
              // Ignorar linhas que não são JSON válido
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *streamGemini(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.preferences.geminiApiKey) {
      throw new Error("Chave da API Google Gemini não configurada");
    }

    const model = this.preferences.geminiModel || "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.preferences.geminiApiKey}`,
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
      throw new Error(
        `Erro Gemini (${response.status}): ${error.error?.message || response.statusText}`
      );
    }

    const reader = (response.body as any)?.getReader();
    if (!reader) {
      throw new Error("Erro ao inicializar stream Gemini");
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignorar linhas que não são JSON válido
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *streamMistral(prompt: string): AsyncGenerator<string, void, unknown> {
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
        temperature: 1,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(`Erro Mistral (${response.status}): ${error.message || response.statusText}`);
    }

    const reader = (response.body as any)?.getReader();
    if (!reader) {
      throw new Error("Erro ao inicializar stream Mistral");
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignorar linhas que não são JSON válido
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *streamSummary(
    jurisprudence: Jurisprudence,
    provider?: LLMProvider
  ): AsyncGenerator<string, void, unknown> {
    const selectedProvider =
      provider || (this.preferences.defaultLlm as LLMProvider) || "anthropic";
    const prompt = this.getPrompt(jurisprudence);

    try {
      console.log(`Iniciando streaming com ${selectedProvider}`);
      switch (selectedProvider) {
        case "openai":
          yield* this.streamOpenAI(prompt);
          break;
        case "anthropic":
          yield* this.streamAnthropic(prompt);
          break;
        case "gemini":
          yield* this.streamGemini(prompt);
          break;
        case "mistral":
          yield* this.streamMistral(prompt);
          break;
        default:
          throw new Error("Provedor LLM não suportado");
      }
    } catch (error) {
      console.error(`Erro no streaming com ${selectedProvider}:`, error);
      throw error;
    }
  }
}
