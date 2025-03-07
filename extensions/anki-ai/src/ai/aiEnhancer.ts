import { AI } from "@raycast/api";
import { Flashcard } from "./flashcardGenerator";
import { Logger } from "../utils/logger";
import { getAIModelIdentifier } from "../constants/aiModels";

export class AIEnhancer {
  static async enhanceFlashcard(
    flashcard: Flashcard,
    options?: {
      model?: string;
      creativity?: number;
    },
  ): Promise<Flashcard> {
    try {
      const language = options?.language || "português";
      const prompt = `Melhore este flashcard adicionando exemplos práticos, informações adicionais relevantes e mnemônicos para facilitar a memorização.
      
      Flashcard atual:
      Frente: ${flashcard.front}
      Verso: ${flashcard.back}
      Extra: ${flashcard.extra || ""}
      Dificuldade: ${flashcard.difficulty || "intermediário"}
      
      Instruções específicas:
      1. Mantenha a pergunta (frente) original
      2. Expanda a resposta (verso) para torná-la mais detalhada e completa, mas ainda concisa
      3. No campo "extra", adicione:
         - 2-3 exemplos concretos e aplicáveis
         - Explicações adicionais que complementem o conceito principal
         - Mnemônicos ou técnicas de memorização específicas
         - Conexões com outros conceitos relacionados
         - Dicas para aplicação prática do conhecimento
      4. Mantenha o conteúdo organizado com subtítulos e formatação clara
      5. Responda em ${language}
      6. Mantenha a dificuldade consistente com o nível "${flashcard.difficulty || "intermediário"}"
      
      Retorne o JSON do flashcard melhorado no seguinte formato:
      {
        "front": "A pergunta original",
        "back": "A resposta expandida e mais detalhada",
        "extra": "Conteúdo enriquecido com exemplos, mnemônicos e informações adicionais",
        "difficulty": "${flashcard.difficulty || "intermediário"}"
      }`;

      // Determinar o modelo a ser usado
      let aiModel = undefined;
      if (options?.model) {
        // Primeiro tenta usar o mapeamento personalizado
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Modelo pode não estar no tipo AI.Model
            aiModel = modelId;
            Logger.debug(`Usando modelo AI com mapeamento personalizado: ${options.model} (${aiModel})`);
          } catch (err) {
            Logger.warn(
              `Modelo não reconhecido pelo mapeamento personalizado: ${options.model}, tentando fallback para AI.Model`,
            );
          }
        }

        // Fallback para o método antigo se o mapeamento personalizado falhar
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
          Logger.debug(`Usando modelo AI com AI.Model: ${options.model} (${aiModel})`);
        }

        if (!aiModel) {
          Logger.warn(`Modelo AI não reconhecido: ${options.model}, usando modelo padrão GPT-4o`);
          // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: options?.creativity || 0.7,
      });

      const enhancedCard = this.parseResponse(response);

      // Garantir que o flashcard original seja preservado se a IA não retornar campos válidos
      return {
        front: enhancedCard.front || flashcard.front,
        back: enhancedCard.back || flashcard.back,
        extra: enhancedCard.extra || flashcard.extra,
        tags: flashcard.tags, // Preservar tags originais
        difficulty: enhancedCard.difficulty || flashcard.difficulty || "intermediário",
      };
    } catch (error) {
      Logger.error("Erro ao melhorar flashcard", error);
      return flashcard; // Retorna o flashcard original em caso de erro
    }
  }

  static async generateExamples(
    concept: string,
    count: number = 3,
    options?: { model?: string; language?: string },
  ): Promise<string[]> {
    try {
      const language = options?.language || "português";
      const prompt = `Gere ${count} exemplos práticos, concretos e aplicáveis para explicar o conceito: "${concept}"
      
      Instruções:
      1. Os exemplos devem ser concisos (máximo 2-3 frases cada)
      2. Devem ilustrar aplicações práticas do conceito
      3. Devem ser diversos, cobrindo diferentes aspectos
      4. Responda em ${language}
      
      Retorne apenas um array JSON com os exemplos, no formato:
      ["Exemplo 1", "Exemplo 2", "Exemplo 3"]`;

      // Determinar o modelo a ser usado
      let aiModel = undefined;
      if (options?.model) {
        // Primeiro tenta usar o mapeamento personalizado
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Modelo pode não estar no tipo AI.Model
            aiModel = modelId;
          } catch (err) {
            Logger.warn(
              `Modelo não reconhecido pelo mapeamento personalizado: ${options.model}, tentando fallback para AI.Model`,
            );
          }
        }

        // Fallback para o método antigo se o mapeamento personalizado falhar
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`Modelo AI não reconhecido: ${options.model}, usando modelo padrão GPT-4o`);
          // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.8,
      });

      try {
        // Tenta extrair um array JSON da resposta
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // Se não encontrou um array JSON, tenta limpar a resposta
        const cleanedResponse = response.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        Logger.error("Erro ao processar exemplos", parseError);

        // Fallback: extrai linhas que começam com números ou hífens como exemplos
        const lines = response
          .split("\n")
          .filter((line) => line.trim().match(/^(\d+[.):]|[-•*])\s+.+/))
          .map((line) => line.replace(/^(\d+[.):]|[-•*])\s+/, "").trim());

        return lines.length > 0 ? lines : [];
      }
    } catch (error) {
      Logger.error("Erro ao gerar exemplos", error);
      return [];
    }
  }

  static async evaluateFlashcard(
    flashcard: Flashcard,
    options?: { model?: string; language?: string },
  ): Promise<{ score: number; suggestions: string[] }> {
    try {
      const language = options?.language || "português";
      const prompt = `Avalie a qualidade deste flashcard e sugira melhorias específicas.
      
      Flashcard:
      Frente: ${flashcard.front}
      Verso: ${flashcard.back}
      Extra: ${flashcard.extra || ""}
      
      Retorne um JSON com:
      - score: número de 0 a 10
      - suggestions: array de sugestões de melhoria (em ${language})
      
      Avalie com base em:
      1. Clareza da pergunta (é específica e não ambígua?)
      2. Precisão da resposta (é correta e completa?)
      3. Utilidade das informações extras (ajudam na compreensão?)
      4. Atomicidade (foca em uma única ideia por cartão?)
      5. Aplicabilidade (tem exemplos práticos?)
      6. Memorabilidade (usa técnicas que facilitam a memorização?)`;

      // Determinar o modelo a ser usado
      let aiModel = undefined;
      if (options?.model) {
        // Primeiro tenta usar o mapeamento personalizado
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Modelo pode não estar no tipo AI.Model
            aiModel = modelId;
          } catch (err) {
            Logger.warn(
              `Modelo não reconhecido pelo mapeamento personalizado: ${options.model}, tentando fallback para AI.Model`,
            );
          }
        }

        // Fallback para o método antigo se o mapeamento personalizado falhar
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`Modelo AI não reconhecido: ${options.model}, usando modelo padrão GPT-4o`);
          // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.5,
      });

      try {
        // Tenta extrair um objeto JSON da resposta
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            score: typeof result.score === "number" ? result.score : 0,
            suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
          };
        }

        // Se não encontrou um objeto JSON, retorna valores padrão
        return { score: 0, suggestions: [] };
      } catch (parseError) {
        Logger.error("Erro ao processar avaliação", parseError);
        return { score: 0, suggestions: [] };
      }
    } catch (error) {
      Logger.error("Erro ao avaliar flashcard", error);
      return { score: 0, suggestions: [] };
    }
  }

  static async generateRelatedQuestions(
    topic: string,
    count: number = 5,
    options?: { model?: string; language?: string },
  ): Promise<{ question: string; answer: string }[]> {
    try {
      const language = options?.language || "português";
      const prompt = `Gere ${count} perguntas relacionadas ao tópico: "${topic}"
      
      Instruções:
      1. Cada pergunta deve explorar um aspecto diferente do tópico
      2. As perguntas devem ser claras, específicas e não ambíguas
      3. As respostas devem ser concisas mas completas
      4. Inclua tanto perguntas factuais quanto conceituais
      5. Responda em ${language}
      
      Retorne um array JSON de objetos com "question" e "answer", no formato:
      [
        {"question": "Pergunta 1?", "answer": "Resposta 1"},
        {"question": "Pergunta 2?", "answer": "Resposta 2"}
      ]`;

      // Determinar o modelo a ser usado
      let aiModel = undefined;
      if (options?.model) {
        // Primeiro tenta usar o mapeamento personalizado
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Modelo pode não estar no tipo AI.Model
            aiModel = modelId;
          } catch (err) {
            Logger.warn(
              `Modelo não reconhecido pelo mapeamento personalizado: ${options.model}, tentando fallback para AI.Model`,
            );
          }
        }

        // Fallback para o método antigo se o mapeamento personalizado falhar
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`Modelo AI não reconhecido: ${options.model}, usando modelo padrão GPT-4o`);
          // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.9,
      });

      try {
        // Tenta extrair um array JSON da resposta
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // Se não encontrou um array JSON, tenta limpar a resposta
        const cleanedResponse = response.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        Logger.error("Erro ao processar perguntas relacionadas", parseError);
        return [];
      }
    } catch (error) {
      Logger.error("Erro ao gerar perguntas relacionadas", error);
      return [];
    }
  }

  static async suggestTags(flashcard: Flashcard, options?: { model?: string; language?: string }): Promise<string[]> {
    try {
      const language = options?.language || "português";
      const prompt = `Sugira tags relevantes para este flashcard:
      
      Flashcard:
      Frente: ${flashcard.front}
      Verso: ${flashcard.back}
      Extra: ${flashcard.extra || ""}
      
      Instruções:
      1. Gere 3-5 tags relevantes baseadas no conteúdo
      2. As tags devem ser palavras-chave ou categorias específicas
      3. Use substantivos simples, preferencialmente no singular
      4. Evite tags muito genéricas ou muito específicas
      5. As tags devem estar em ${language}
      
      Retorne apenas um array JSON com as tags sugeridas.`;

      // Determinar o modelo a ser usado
      let aiModel = undefined;
      if (options?.model) {
        // Primeiro tenta usar o mapeamento personalizado
        const modelId = getAIModelIdentifier(options.model);
        if (modelId) {
          try {
            // @ts-expect-error - Modelo pode não estar no tipo AI.Model
            aiModel = modelId;
          } catch (err) {
            Logger.warn(
              `Modelo não reconhecido pelo mapeamento personalizado: ${options.model}, tentando fallback para AI.Model`,
            );
          }
        }

        // Fallback para o método antigo se o mapeamento personalizado falhar
        if (!aiModel && options.model in AI.Model) {
          aiModel = AI.Model[options.model as keyof typeof AI.Model];
        }

        if (!aiModel) {
          Logger.warn(`Modelo AI não reconhecido: ${options.model}, usando modelo padrão GPT-4o`);
          // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
          aiModel = "openai-gpt-4o";
        }
      } else {
        // @ts-expect-error - Modelo padrão pode não existir no tipo AI.Model
        aiModel = "openai-gpt-4o";
      }

      const response = await AI.ask(prompt, {
        model: aiModel,
        creativity: 0.3,
      });

      try {
        // Tenta extrair um array JSON da resposta
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // Se não encontrou um array JSON, tenta limpar a resposta
        const cleanedResponse = response.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        Logger.error("Erro ao processar tags sugeridas", parseError);

        // Fallback: extrai palavras que parecem ser tags
        const tagPattern = /(#\w+|\b\w+\b)/g;
        const possibleTags = response.match(tagPattern) || [];
        return possibleTags
          .map((tag) => tag.replace("#", "").trim())
          .filter((tag) => tag.length > 2 && !/^\d+$/.test(tag));
      }
    } catch (error) {
      Logger.error("Erro ao sugerir tags", error);
      return [];
    }
  }

  private static parseResponse(response: string): Flashcard {
    try {
      // Tenta encontrar um objeto JSON na resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/s);
      const jsonString = jsonMatch ? jsonMatch[0] : response;

      // Limpa o texto de marcações Markdown antes de analisar
      const cleanedJson = jsonString.replace(/```json|```/g, "").trim();

      const result = JSON.parse(cleanedJson);

      // Valida se os campos necessários estão presentes
      if (!result.front && !result.back && !result.extra) {
        throw new Error("JSON inválido: faltam campos obrigatórios");
      }

      // Valida o campo de dificuldade
      if (result.difficulty && !["iniciante", "intermediário", "avançado"].includes(result.difficulty)) {
        result.difficulty = "intermediário"; // Valor padrão se inválido
      }

      return result;
    } catch (error) {
      Logger.error("Erro ao processar resposta da IA", error);

      // Tenta extrair campos do texto não estruturado
      const frontMatch = response.match(/front["\s:]+([^"]+)/i);
      const backMatch = response.match(/back["\s:]+([^"]+)/i);
      const extraMatch = response.match(/extra["\s:]+([^"]+)/i);
      const difficultyMatch = response.match(/difficulty["\s:]+([^"]+)/i);

      return {
        front: frontMatch ? frontMatch[1].trim() : "",
        back: backMatch ? backMatch[1].trim() : "",
        extra: extraMatch ? extraMatch[1].trim() : "",
        difficulty:
          difficultyMatch && ["iniciante", "intermediário", "avançado"].includes(difficultyMatch[1].trim())
            ? (difficultyMatch[1].trim() as "iniciante" | "intermediário" | "avançado")
            : "intermediário",
      };
    }
  }
}
