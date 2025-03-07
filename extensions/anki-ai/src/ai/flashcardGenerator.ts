import { AI, getPreferenceValues } from "@raycast/api";
import { Logger } from "../utils/logger";
import { ErrorHandler } from "../utils/errorHandler";

export interface Flashcard {
  front: string;
  back: string;
  extra?: string;
  image?: string;
  tags?: string[];
}

interface FlashcardGeneratorOptions {
  model?: string;
  language?: string;
  minFlashcards?: number;
  maxFlashcards?: number;
  enableTags?: boolean;
  customPrompt?: string;
  debugMode?: boolean;
}

interface Preferences {
  defaultLanguage: string;
  defaultModel: string;
  minFlashcards: string;
  maxFlashcards: string;
  enableTags: boolean;
  customPromptTemplate: string;
  debugMode: boolean;
}

export class FlashcardGenerator {
  static async generate(text: string, options?: FlashcardGeneratorOptions): Promise<Flashcard[]> {
    try {
      if (!text || text.trim().length === 0) {
        Logger.warn("Texto vazio fornecido para geração de flashcards");
        return [];
      }

      // Get preferences
      const preferences = getPreferenceValues<Preferences>();

      // Merge options with preferences
      const language = options?.language || preferences.defaultLanguage || "português";
      const minFlashcards = options?.minFlashcards || parseInt(preferences.minFlashcards || "5", 10);
      const maxFlashcards = options?.maxFlashcards || parseInt(preferences.maxFlashcards || "20", 10);
      const enableTags = options?.enableTags !== undefined ? options.enableTags : preferences.enableTags;
      const debugMode = options?.debugMode !== undefined ? options.debugMode : preferences.debugMode;

      // Enable debug mode if needed
      if (debugMode) {
        Logger.setDebugMode(true);
      }

      Logger.info(
        `Gerando flashcards com AI Raycast. Modelo: ${options?.model || preferences.defaultModel || "default"}, Idioma: ${language}`,
      );
      Logger.debug(`Configurações: Min=${minFlashcards}, Max=${maxFlashcards}, Tags=${enableTags}, Debug=${debugMode}`);

      // Build prompt using custom template if available
      const prompt = this.buildPrompt(text, language, {
        minFlashcards,
        maxFlashcards,
        enableTags,
        customPrompt: options?.customPrompt || preferences.customPromptTemplate,
      });

      // Use Raycast's built-in AI.ask function with model options if provided
      let aiModel = undefined;
      if (options?.model || preferences.defaultModel) {
        try {
          const modelName = options?.model || preferences.defaultModel;
          aiModel = AI.Model[modelName as keyof typeof AI.Model];
          Logger.debug(`Usando modelo AI: ${modelName} (${aiModel})`);
        } catch (error) {
          Logger.warn(`Modelo AI inválido: ${options?.model || preferences.defaultModel}, usando modelo padrão`);
        }
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 1, // Medium creativity level
      });

      if (!response || response.trim().length === 0) {
        Logger.warn("Resposta vazia da IA");
        return [];
      }

      Logger.debug(`Resposta da IA (primeiros 200 caracteres): ${response.substring(0, 200)}...`);

      const flashcards = this.parseResponse(response, minFlashcards);

      // Validate number of flashcards
      if (flashcards.length < minFlashcards) {
        Logger.warn(
          `Número de flashcards gerados (${flashcards.length}) é menor que o mínimo configurado (${minFlashcards})`,
        );
      }

      // Limit number of flashcards if needed
      const limitedFlashcards = flashcards.slice(0, maxFlashcards);
      if (flashcards.length > maxFlashcards) {
        Logger.info(`Limitando número de flashcards de ${flashcards.length} para ${maxFlashcards}`);
      }

      Logger.info(`${limitedFlashcards.length} flashcards gerados com sucesso`);

      return limitedFlashcards;
    } catch (error) {
      Logger.error("Erro ao gerar flashcards:", error);
      ErrorHandler.handleAIError(error);
      return [];
    }
  }

  private static buildPrompt(
    text: string,
    language: string,
    options: {
      minFlashcards: number;
      maxFlashcards: number;
      enableTags: boolean;
      customPrompt?: string;
    },
  ): string {
    // Use custom prompt template if available
    if (options.customPrompt) {
      return options.customPrompt
        .replace(/{text}/g, text)
        .replace(/{language}/g, language)
        .replace(/{minFlashcards}/g, options.minFlashcards.toString())
        .replace(/{maxFlashcards}/g, options.maxFlashcards.toString());
    }

    // Default prompt
    let prompt = `Transforme o seguinte texto em flashcards no formato JSON com campos "front", "back" e "extra". 
    O campo "front" deve conter uma pergunta ou conceito.
    O campo "back" deve conter a resposta ou explicação concisa.
    O campo "extra" deve conter informações adicionais, exemplos ou contexto que ajudem a entender melhor o conceito.
    Crie flashcards que sigam o princípio da atomicidade (uma ideia por cartão).
    Gere entre ${options.minFlashcards} e ${options.maxFlashcards} flashcards.
    Retorne apenas o array JSON sem explicações adicionais.
    Idioma: ${language}`;

    // Add tags if enabled
    if (options.enableTags) {
      prompt += `
    Inclua um campo "tags" com um array de palavras-chave relevantes para cada flashcard.`;
    }

    prompt += `
    
    Texto:
    "${text}"`;

    return prompt;
  }

  private static parseResponse(response: string, minFlashcards: number): Flashcard[] {
    try {
      // Tenta extrair apenas o JSON se houver texto adicional
      const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
      const jsonString = jsonMatch ? jsonMatch[0] : response;

      Logger.debug(`Tentando analisar JSON: ${jsonString.substring(0, 100)}...`);

      let flashcards;
      try {
        // Primeiro, verifica se o texto está dentro de um bloco de código Markdown
        const markdownMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch) {
          // Se encontrou um bloco de código, usa o conteúdo dentro dele
          flashcards = JSON.parse(markdownMatch[1]) as Flashcard[];
        } else {
          // Caso contrário, tenta analisar o texto diretamente
          flashcards = JSON.parse(jsonString) as Flashcard[];
        }
      } catch (jsonError) {
        // Tenta limpar o texto e tentar novamente
        Logger.warn("Falha ao analisar JSON, tentando limpar o texto", jsonError);

        // Remove caracteres que podem estar causando problemas
        const cleanedText = jsonString
          .replace(/[^\x20-\x7E]/g, "") // Remove caracteres não imprimíveis
          .replace(/\\(?!["\\/bfnrt])/g, "\\\\") // Escapa barras invertidas não seguidas por caracteres de escape válidos
          .replace(/```(?:json)?\s*|\s*```/g, ""); // Remove marcações Markdown de código JSON

        try {
          flashcards = JSON.parse(cleanedText) as Flashcard[];
        } catch (secondError) {
          // Tenta encontrar qualquer array no texto
          Logger.warn("Segunda tentativa falhou, procurando por arrays no texto", secondError);

          // Tenta extrair arrays JSON do texto
          const arrayMatches = [
            // Tenta encontrar arrays dentro de blocos de código
            jsonString.match(/```(?:json)?\s*(\[\s*[\s\S]*?\])\s*```/),
            // Tenta encontrar arrays diretamente no texto
            jsonString.match(/\[\s*\{[\s\S]*?\}\s*\]/),
            // Tenta com texto limpo
            cleanedText.match(/\[\s*\{[\s\S]*?\}\s*\]/),
          ].filter(Boolean);

          if (arrayMatches.length > 0) {
            // Tenta cada match até encontrar um válido
            for (const match of arrayMatches) {
              if (!match) continue;

              try {
                const content = match[1] || match[0]; // match[1] para grupos capturados, match[0] para o match completo
                flashcards = JSON.parse(content) as Flashcard[];
                if (flashcards.length > 0) break; // Se encontrou flashcards válidos, para de tentar
              } catch (parseError) {
                // Continua tentando com o próximo match
                Logger.debug("Falha ao analisar match", parseError);
              }
            }
          }

          // Se ainda não encontrou flashcards válidos
          if (!flashcards || flashcards.length === 0) {
            Logger.error("Todas as tentativas de análise JSON falharam");
            // Retorna um array vazio em vez de lançar erro para permitir que o fluxo continue
            flashcards = [];
          }
        }
      }

      // Validação básica
      if (!Array.isArray(flashcards)) {
        Logger.warn("Resposta não é um array", flashcards);
        throw new Error("Resposta não é um array");
      }

      // Filtra flashcards inválidos
      const validFlashcards = flashcards
        .filter((card) => card && typeof card.front === "string" && typeof card.back === "string")
        .map((card) => ({
          ...card,
          front: card.front.trim(),
          back: card.back.trim(),
          extra: card.extra ? card.extra.trim() : "", // Garante que o campo extra sempre existe
          tags: Array.isArray(card.tags) ? card.tags : [], // Garante que o campo tags sempre é um array
        }));

      Logger.debug(`Flashcards válidos: ${validFlashcards.length} de ${flashcards.length}`);

      // Verifica se temos flashcards suficientes
      if (!validFlashcards || validFlashcards.length < minFlashcards) {
        Logger.warn(
          `Número de flashcards gerados (${validFlashcards ? validFlashcards.length : 0}) é menor que o mínimo configurado (${minFlashcards})`,
        );

        // Se não tiver flashcards suficientes mas tiver alguns, retorna o que temos
        if (validFlashcards && validFlashcards.length > 0) {
          return validFlashcards;
        }

        // Se não tiver nenhum flashcard, tenta uma abordagem mais simples
        try {
          // Extrai qualquer conteúdo que pareça ser um flashcard, mesmo que não esteja em formato JSON
          const possibleFlashcards = this.extractPossibleFlashcards(response);
          if (possibleFlashcards.length > 0) {
            return possibleFlashcards;
          }
        } catch (extractError) {
          Logger.error("Falha ao extrair possíveis flashcards", extractError);
        }

        throw new Error("Não foi possível gerar flashcards suficientes. Tente novamente ou ajuste suas configurações.");
      }

      return validFlashcards;
    } catch (error) {
      Logger.error("Erro ao processar resposta da IA", error);
      return [];
    }
  }

  private static extractPossibleFlashcards(response: string): Flashcard[] {
    // Implementação para extrair possíveis flashcards de um texto
    // Essa implementação pode ser personalizada de acordo com as necessidades específicas
    const lines = response.split("\n");
    const flashcards: Flashcard[] = [];

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const front = match[1].trim();
        const back = match[2].trim();
        flashcards.push({ front, back });
      }
    }

    return flashcards;
  }
}
