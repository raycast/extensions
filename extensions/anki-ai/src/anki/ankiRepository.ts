import { AnkiResponse, AnkiNote } from "./ankiTypes";
import axios from "axios";
import { Logger } from "../utils/logger";

const ANKI_CONNECT_URL = "http://localhost:8765";

export class AnkiRepository {
  /**
   * Function to test if AnkiConnect is working correctly
   */
  static async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    try {
      Logger.debug("Starting AnkiConnect connection test");

      // Check if Anki is running first
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        return {
          success: false,
          message: "Anki is not open. Please open Anki before trying to export flashcards.",
          details: { ankiRunning: false },
        };
      }

      // Test directly and simply with retries
      const maxAttempts = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          Logger.debug(`Attempt ${attempt}/${maxAttempts} - Sending version request to AnkiConnect...`);
          const response = await axios.post(
            ANKI_CONNECT_URL,
            {
              action: "version",
              version: 6,
            },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 15000,
            },
          );

          Logger.debug(`Response received: ${JSON.stringify(response.data)}`);
          const data = response.data;

          if (data.error) {
            Logger.debug(`Error returned by AnkiConnect: ${data.error}`);
            return {
              success: false,
              message: `AnkiConnect error: ${data.error}`,
              details: data,
            };
          }

          const version = data.result as number;
          Logger.debug(`AnkiConnect version: ${version}`);

          if (version < 6) {
            return {
              success: false,
              message: `AnkiConnect version (${version}) is lower than the required version (6). Please update AnkiConnect.`,
              details: { version },
            };
          }

          // Additional test: try to get the list of decks
          // Using a separate retry system for this operation
          Logger.debug("Trying to get list of decks...");
          let decksSuccess = false;
          let decksResponse = null;

          for (let decksAttempt = 1; decksAttempt <= maxAttempts; decksAttempt++) {
            try {
              Logger.debug(`Attempt ${decksAttempt}/${maxAttempts} to get decks...`);
              decksResponse = await this.request<string[]>("deckNames", {}, 6, {
                timeout: 15000,
                retries: 0,
              });

              if (decksResponse.error) {
                Logger.debug(`Error getting decks: ${decksResponse.error}`);
                lastError = new Error(decksResponse.error);
              } else {
                decksSuccess = true;
                Logger.debug(`Decks obtained successfully: ${decksResponse.result?.length || 0} decks`);
                break;
              }
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              Logger.debug(`Error on attempt ${decksAttempt} to get decks: ${lastError.message}`);
            }

            if (decksAttempt < maxAttempts) {
              const waitTime = 2000;
              Logger.debug(`Waiting ${waitTime}ms before next attempt...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }

          if (!decksSuccess) {
            if (lastError?.message.includes("ECONNREFUSED") || lastError?.message.includes("ECONNRESET")) {
              return {
                success: false,
                message:
                  "Failed to connect to AnkiConnect. Verify that the AnkiConnect plugin is installed in Anki and that Anki is open.",
                details: {
                  ankiRunning: true,
                  version: version,
                  error: lastError?.message,
                  installationInstructions:
                    "To install AnkiConnect:\n1. Open Anki\n2. Go to Tools > Add-ons > Get Add-ons\n3. Paste the code 2055492159\n4. Restart Anki after installation",
                },
              };
            }

            return {
              success: false,
              message: `Error getting decks from Anki: ${lastError?.message || "Unknown error"}. Anki may not be running.`,
              details: { error: lastError?.message },
            };
          }

          return {
            success: true,
            message: "Connection to Anki successful",
            details: { version, decks: decksResponse.result },
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          Logger.debug(`Error on attempt ${attempt}: ${lastError.message}`);

          if (attempt < maxAttempts) {
            const waitTime = 2000 * attempt; // Exponential backoff
            Logger.debug(`Waiting ${waitTime}ms before next attempt...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      // If we get here, all attempts failed
      const errorMessage = lastError?.message || "Unknown error";
      Logger.error(`All connection attempts failed: ${errorMessage}`);

      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ECONNRESET")) {
        return {
          success: false,
          message:
            "Failed to connect to AnkiConnect. Verify that the AnkiConnect plugin is installed in Anki and that Anki is open.",
          details: {
            error: errorMessage,
            installationInstructions:
              "To install AnkiConnect:\n1. Open Anki\n2. Go to Tools > Add-ons > Get Add-ons\n3. Paste the code 2055492159\n4. Restart Anki after installation",
          },
        };
      }

      return {
        success: false,
        message: `Failed to connect to Anki: ${errorMessage}`,
        details: { error: errorMessage },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Unexpected error in testConnection: ${errorMessage}`);

      return {
        success: false,
        message: `Unexpected error: ${errorMessage}`,
        details: { error: errorMessage },
      };
    }
  }

  /**
   * Check if Anki is running
   */
  static async isAnkiRunning(): Promise<boolean> {
    try {
      // First try a simple GET request
      try {
        const response = await axios.get(ANKI_CONNECT_URL, { timeout: 1000 });
        return response.status === 200;
      } catch (error) {
        // If GET fails, try a POST request
        if (error.code === "ECONNREFUSED") {
          return false;
        }
      }

      // Try a POST request as a fallback
      try {
        await axios.post(
          ANKI_CONNECT_URL,
          { action: "version", version: 6 },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 1000,
          },
        );
        return true;
      } catch (error) {
        if (error.code === "ECONNREFUSED") {
          return false;
        }

        // If we get ECONNRESET, Anki might be running but AnkiConnect is not responding properly
        if (error.code === "ECONNRESET") {
          // Try one more time with a longer timeout
          try {
            await axios.post(
              ANKI_CONNECT_URL,
              { action: "version", version: 6 },
              {
                headers: { "Content-Type": "application/json" },
                timeout: 3000,
              },
            );
            return true;
          } catch (secondError) {
            // If we still get an error, Anki might be running but AnkiConnect is not working properly
            // We'll return true and let the testConnection method handle the details
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      Logger.error(`Error checking if Anki is running: ${error}`);
      return false;
    }
  }

  /**
   * Send a request to AnkiConnect
   */
  static async request<T>(
    action: string,
    params = {},
    version = 6,
    options?: { timeout?: number; retries?: number },
  ): Promise<AnkiResponse> {
    const timeout = options?.timeout || 10000;
    const maxRetries = options?.retries !== undefined ? options.retries : 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        Logger.ankiRequest(action, params);

        const response = await axios.post(
          ANKI_CONNECT_URL,
          {
            action,
            params,
            version,
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout,
          },
        );

        const data = response.data;
        Logger.ankiRequest(action, params, data);

        if (data.error) {
          return { error: data.error, result: null };
        }

        return { error: null, result: data.result as T };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        Logger.error(`Error on attempt ${attempt + 1}/${maxRetries + 1} for action ${action}: ${lastError.message}`);

        if (attempt < maxRetries) {
          const waitTime = 1000 * Math.pow(2, attempt); // Exponential backoff
          Logger.debug(`Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // If we get here, all attempts failed
    const errorMessage = lastError?.message || "Unknown error";

    if (errorMessage.includes("ECONNREFUSED")) {
      return {
        error: "Connection refused. Make sure Anki is running and AnkiConnect is installed.",
        result: null,
      };
    }

    if (errorMessage.includes("ECONNRESET")) {
      return {
        error: "Connection reset. Anki may be running but AnkiConnect is not responding properly. Try restarting Anki.",
        result: null,
      };
    }

    if (errorMessage.includes("timeout")) {
      return {
        error: "Connection timed out. Anki may be busy or not responding. Try restarting Anki.",
        result: null,
      };
    }

    return {
      error: `Failed to connect to AnkiConnect: ${errorMessage}`,
      result: null,
    };
  }

  /**
   * Verifica se um campo é considerado obrigatório para o modelo
   * Campos como Front/Frente e Back/Verso geralmente são obrigatórios
   */
  private static isRequiredField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return (
      lowerField.includes("front") ||
      lowerField.includes("frente") ||
      lowerField.includes("back") ||
      lowerField.includes("verso") ||
      lowerField.includes("text") || // Para modelos Cloze
      lowerField.includes("texto") // Para modelos Cloze em português
    );
  }

  /**
   * Adiciona flashcards ao Anki
   *
   * Esta função é a principal para exportação de flashcards para o Anki.
   * Ela verifica a conexão, cria o deck se necessário, e adiciona os flashcards.
   */
  static async addFlashcards(
    flashcards: FlashcardData[],
    deckName: string,
    modelName = "Raycast Flashcards",
    options: {
      tags?: string[];
      fields?: Record<string, string>;
    } = {},
  ): Promise<{
    success: boolean;
    message: string;
    details?: unknown;
  }> {
    try {
      Logger.debug(`Iniciando exportação de ${flashcards.length} flashcards para o deck "${deckName}"`);

      // 1. Verificar se o Anki está rodando
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        const message = "O Anki não está aberto. Por favor, abra o Anki antes de tentar exportar flashcards.";
        Logger.error(message);
        return {
          success: false,
          message,
          details: { ankiRunning: false },
        };
      }

      // 2. Criar o deck se não existir
      try {
        Logger.debug(`Verificando deck "${deckName}"...`);
        const decks = await this.getDecks();

        if (!decks.includes(deckName)) {
          Logger.debug(`Deck "${deckName}" não encontrado. Criando novo deck...`);
          await this.createDeck(deckName);
          Logger.debug(`Deck "${deckName}" criado com sucesso!`);
        } else {
          Logger.debug(`Deck "${deckName}" encontrado.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(`Erro ao verificar/criar deck: ${errorMessage}`);
        return {
          success: false,
          message: `Não foi possível criar ou verificar o deck "${deckName}". Erro: ${errorMessage}`,
          details: { error: errorMessage },
        };
      }

      // 3. Garantir que o modelo existe
      try {
        Logger.debug(`Verificando modelo "${modelName}"...`);
        const models = await this.modelNames();

        if (!models.includes(modelName)) {
          if (modelName === "Raycast Flashcards") {
            Logger.debug(`Modelo "${modelName}" não encontrado. Criando modelo padrão...`);
            await this.createRaycastFlashcardsModelIfNeeded();
            Logger.debug(`Modelo "${modelName}" criado com sucesso!`);
          } else {
            throw new Error(`O modelo "${modelName}" não existe no Anki.`);
          }
        } else {
          Logger.debug(`Modelo "${modelName}" encontrado.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(`Erro ao verificar/criar modelo: ${errorMessage}`);
        return {
          success: false,
          message: `Não foi possível utilizar o modelo "${modelName}". Erro: ${errorMessage}`,
          details: { error: errorMessage },
        };
      }

      // 4. Preparar as notas para adição
      Logger.debug("Preparando notas para adição...");
      const notes: AnkiNote[] = [];
      let processedCount = 0;

      // Processar cada flashcard em lotes pequenos para evitar sobrecarregar a conexão
      const batchSize = 10;
      const totalBatches = Math.ceil(flashcards.length / batchSize);

      // Processar em lotes
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, flashcards.length);
        const batchFlashcards = flashcards.slice(start, end);

        Logger.debug(`Processando lote ${batchIndex + 1}/${totalBatches} (${batchFlashcards.length} flashcards)...`);

        // Processar cada flashcard do lote
        for (const flashcard of batchFlashcards) {
          try {
            // Mapear os campos do flashcard para o modelo do Anki
            const fields = await this.mapFlashcardToModelFields(flashcard, modelName, options.fields);

            // Preparar tags
            const tags = [...(options.tags || [])];
            if (flashcard.tags && Array.isArray(flashcard.tags)) {
              tags.push(...flashcard.tags);
            }

            // Se houver uma dificuldade definida, adicionar como tag
            if (flashcard.difficulty) {
              tags.push(`dificuldade:${flashcard.difficulty}`);
            }

            // Criar a nota
            const note: AnkiNote = {
              deckName,
              modelName,
              fields,
              tags: [...new Set(tags)], // Remover duplicatas
            };

            notes.push(note);
            processedCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            Logger.warn(`Problema ao processar flashcard #${processedCount + 1}: ${errorMessage}`);
            // Continuamos mesmo com erro em um flashcard individual
          }
        }

        // Pequena pausa entre lotes para não sobrecarregar o AnkiConnect
        if (batchIndex < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // 5. Verificar se temos notas para adicionar
      if (notes.length === 0) {
        Logger.warn("Não há flashcards válidos para adicionar.");
        return {
          success: false,
          message:
            "Não foi possível processar nenhum flashcard para exportação. Verifique o formato dos seus flashcards.",
          details: { processedCount: 0 },
        };
      }

      // 6. Adicionar as notas ao Anki
      Logger.debug(`Adicionando ${notes.length} notas ao Anki...`);
      try {
        const addedIds = await this.addNotes(notes);

        // Contar quantas notas foram adicionadas com sucesso
        const successCount = addedIds.filter((id) => id !== null).length;

        // Preparar mensagem de resultado
        if (successCount === notes.length) {
          const message = `${successCount} flashcard${successCount !== 1 ? "s" : ""} exportado${successCount !== 1 ? "s" : ""} com sucesso para o deck "${deckName}".`;
          Logger.debug(message);
          return {
            success: true,
            message,
            details: {
              added: successCount,
              total: notes.length,
              failed: 0,
            },
          };
        } else if (successCount > 0) {
          const message = `${successCount} de ${notes.length} flashcard${notes.length !== 1 ? "s" : ""} exportado${successCount !== 1 ? "s" : ""} com sucesso para o deck "${deckName}". Alguns flashcards podem ser duplicados ou inválidos.`;
          Logger.debug(message);
          return {
            success: true,
            message,
            details: {
              added: successCount,
              total: notes.length,
              failed: notes.length - successCount,
            },
          };
        } else {
          throw new Error("Nenhum flashcard pôde ser adicionado. Verifique se os flashcards não são duplicados.");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(`Erro ao adicionar notas: ${errorMessage}`);
        return {
          success: false,
          message: `Erro ao exportar flashcards: ${errorMessage}`,
          details: { error: errorMessage },
        };
      }
    } catch (error) {
      // Capturar qualquer erro não tratado
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro geral na exportação de flashcards: ${errorMessage}`);
      return {
        success: false,
        message: `Ocorreu um erro inesperado ao exportar flashcards: ${errorMessage}`,
        details: { error: errorMessage },
      };
    }
  }

  /**
   * Obtém todas as tags existentes no Anki
   */
  static async getTags(): Promise<string[]> {
    try {
      const tags = await this.request<string[]>("getTags");
      return tags || [];
    } catch (error) {
      Logger.error("Erro ao obter tags do Anki:", error);
      return [];
    }
  }

  /**
   * Encontra tags relevantes com base no conteúdo do flashcard
   */
  static findRelevantTags(content: string, existingTags: string[]): string[] {
    if (!content || !existingTags || !Array.isArray(existingTags) || existingTags.length === 0) {
      return [];
    }

    // Normalizar o conteúdo (remover caracteres especiais, converter para minúsculas)
    const normalizedContent = content
      .toLowerCase()
      .replace(/<[^>]*>/g, "") // Remover HTML
      .replace(/[^\w\s]/g, " ") // Substituir caracteres especiais por espaços
      .replace(/\s+/g, " ") // Normalizar espaços
      .trim();

    // Encontrar tags que aparecem no conteúdo
    const relevantTags: string[] = [];
    for (const tag of existingTags) {
      // Ignorar tags muito curtas (menos de 3 caracteres)
      if (tag.length < 3) continue;

      // Verificar se a tag aparece como palavra completa no conteúdo
      const tagRegex = new RegExp(`\\b${tag.toLowerCase()}\\b`);
      if (tagRegex.test(normalizedContent)) {
        relevantTags.push(tag);
      }
    }

    // Limitar a 5 tags para não sobrecarregar
    return relevantTags.slice(0, 5);
  }

  /**
   * Cria um modelo personalizado para Raycast Flashcards se não existir
   */
  static async createRaycastFlashcardsModelIfNeeded(): Promise<AnkiResponse> {
    try {
      Logger.debug("Iniciando verificação do modelo Raycast Flashcards");

      // Primeiro, verificar se o Anki está rodando
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        Logger.warn("Anki não está rodando. Não é possível criar o modelo.");
        return {
          error: "Anki não está rodando. Por favor, abra o Anki e tente novamente.",
          result: null,
        };
      }

      // Verificar se o modelo já existe
      const modelsResponse = await this.request("modelNames", {}, 6, {
        retries: 2,
        timeout: 10000, // Aumentar timeout para dar mais tempo ao Anki
      });

      if (modelsResponse.error) {
        Logger.error(`Erro ao obter lista de modelos: ${modelsResponse.error}`);
        return { error: `Erro ao verificar modelos: ${modelsResponse.error}`, result: null };
      }

      const models = modelsResponse.result as string[];
      Logger.debug(`Modelos disponíveis: ${JSON.stringify(models)}`);

      if (models.includes("Raycast Flashcards")) {
        Logger.debug("Modelo 'Raycast Flashcards' já existe");
        return { error: null, result: true };
      }

      // Criar o modelo se não existir
      Logger.debug("Criando modelo 'Raycast Flashcards'");

      // Definir o modelo
      const modelFields = ["Front", "Back", "Extra"];

      const css = `.card {
        font-family: Arial, sans-serif;
        font-size: 20px;
        text-align: center;
        color: black;
        background-color: white;
        padding: 20px;
      }
      .front {
        font-weight: bold;
      }
      .back {
        margin-top: 10px;
      }
      .extra {
        font-size: 16px;
        color: #555;
        margin-top: 15px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }`;

      // Definir os templates
      const templates = [
        {
          name: "Card 1",
          qfmt: "{{Front}}",
          afmt: "{{FrontSide}}<hr id=answer><div class='back'>{{Back}}</div>{{#Extra}}<div class='extra'>{{Extra}}</div>{{/Extra}}",
        },
      ];

      // Adicionar um pequeno atraso antes de criar o modelo
      // Isso pode ajudar a evitar problemas de conexão
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Criar o modelo com mais retentativas e timeout maior
      const createModelResponse = await this.request(
        "createModel",
        {
          modelName: "Raycast Flashcards",
          inOrderFields: modelFields,
          css: css,
          cardTemplates: templates,
        },
        6,
        {
          retries: 3,
          timeout: 20000, // Aumentar timeout para 20 segundos
        },
      );

      if (createModelResponse.error) {
        Logger.error(`Falha ao criar modelo: ${createModelResponse.error}`);

        // Verificar se o erro é relacionado ao campo "Front"
        if (createModelResponse.error.includes("Front")) {
          Logger.warn("Erro relacionado ao campo 'Front'. Tentando abordagem alternativa...");

          // Tentar com uma abordagem alternativa - verificar se o modelo foi criado parcialmente
          const checkAgainResponse = await this.modelNames();
          if (!checkAgainResponse.error && (checkAgainResponse.result as string[]).includes("Raycast Flashcards")) {
            Logger.debug("Modelo parece ter sido criado apesar do erro. Considerando sucesso.");
            return { error: null, result: true };
          }
        }

        return createModelResponse;
      }

      Logger.debug("Modelo 'Raycast Flashcards' criado com sucesso");

      // Adicionar um pequeno atraso antes de verificar
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verificar se o modelo foi realmente criado
      const verifyResponse = await this.modelNames();
      if (verifyResponse.error) {
        Logger.error(`Erro ao verificar criação do modelo: ${verifyResponse.error}`);
        return { error: `Erro ao verificar criação do modelo: ${verifyResponse.error}`, result: null };
      }

      const updatedModels = verifyResponse.result as string[];
      if (!updatedModels.includes("Raycast Flashcards")) {
        Logger.error("Modelo foi criado mas não aparece na lista de modelos");
        return { error: "Modelo foi criado mas não aparece na lista de modelos", result: null };
      }

      return { error: null, result: true };
    } catch (error) {
      Logger.error("Erro ao criar modelo 'Raycast Flashcards':", error);
      return {
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar modelo",
        result: null,
      };
    }
  }

  /**
   * Função para testar o AnkiConnect e o deck de destino
   */
  static async testAnkiWithDeck(deckName: string): Promise<{ success: boolean; message: string; details?: unknown }> {
    try {
      // Primeiro, verificar a conexão básica
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return connectionTest;
      }

      // Se a conexão básica estiver ok, verificar o deck específico
      Logger.debug(`Testando acesso ao deck: ${deckName}`);
      const decksResponse = await this.request<string[]>("deckNames", {}, 6, {
        timeout: 10000,
        retries: 2, // Reduzindo para 2 tentativas neste caso específico
      });

      if (decksResponse.error) {
        return {
          success: false,
          message: `Erro ao obter lista de decks: ${decksResponse.error}`,
          details: decksResponse,
        };
      }

      const decks = decksResponse.result || [];
      if (!decks.includes(deckName)) {
        return {
          success: false,
          message: `O deck "${deckName}" não foi encontrado. Você precisa criar este deck no Anki primeiro.`,
          details: { availableDecks: decks },
        };
      }

      // Teste adicional: verificar se podemos adicionar uma nota de teste
      const testNote: AnkiNote = {
        deckName: deckName,
        modelName: "Basic", // Usando o modelo básico para o teste
        fields: {
          Front: "_TESTE_CONEXAO_RAYCAST (Desconsidere este card, apenas testando a conexão)",
          Back: "Este é um card de teste para verificar a conexão entre o Raycast e o Anki.",
        },
        options: {
          allowDuplicate: false,
          duplicateScope: "deck",
        },
        tags: ["teste", "raycast_test"],
      };

      try {
        Logger.debug("Enviando nota de teste para verificar permissões de escrita");
        const addNoteResponse = await this.request<number>("addNote", { note: testNote }, 6, {
          timeout: 15000, // 15 segundos para este teste específico
          retries: 2,
        });

        if (addNoteResponse.error) {
          // Se o erro for de duplicata, ainda é um sucesso porque significa que podemos acessar o deck
          if (addNoteResponse.error.includes("duplicate")) {
            Logger.debug("Nota de teste é uma duplicata, mas o teste ainda passou (podemos acessar o deck)");
            return {
              success: true,
              message: `Conexão com o Anki e acesso ao deck "${deckName}" confirmados. Nota de teste é uma duplicata.`,
              details: { deck: deckName, noteTestResult: "duplicate" },
            };
          }

          // Se for outro tipo de erro, é um problema
          return {
            success: false,
            message: `O deck "${deckName}" foi encontrado, mas não foi possível adicionar uma nota de teste: ${addNoteResponse.error}`,
            details: { deck: deckName, error: addNoteResponse.error },
          };
        }

        const noteId = addNoteResponse.result;
        Logger.debug(`Nota de teste adicionada com sucesso, ID: ${noteId}`);

        // Opcional: remover a nota de teste para não poluir o deck
        // Isso é útil, mas poderíamos manter a nota para verificações futuras
        try {
          await this.request("deleteNotes", { notes: [noteId] });
          Logger.debug("Nota de teste removida após o teste bem-sucedido");
        } catch (deleteError) {
          // Ignoramos erros ao tentar remover a nota de teste, pois o teste já foi bem-sucedido
          Logger.debug(`Nota: não foi possível remover a nota de teste: ${String(deleteError)}`);
        }

        return {
          success: true,
          message: `Conexão com o Anki e acesso ao deck "${deckName}" confirmados.`,
          details: { deck: deckName, noteTestResult: "success" },
        };
      } catch (noteTestError) {
        // Se falhar ao adicionar a nota, ainda podemos considerar sucesso parcial
        // se pelo menos confirmamos que o deck existe
        Logger.warn(`Não foi possível testar a adição de nota: ${String(noteTestError)}`);
        return {
          success: true,
          message: `O deck "${deckName}" foi encontrado, mas não foi possível verificar permissões de escrita.`,
          details: { deck: deckName, noteTestResult: "error", error: String(noteTestError) },
        };
      }
    } catch (error) {
      Logger.error(`Erro no teste de Anki com deck: ${String(error)}`);
      return {
        success: false,
        message: `Erro ao testar Anki com o deck: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: String(error) },
      };
    }
  }

  /**
   * Obtém a lista de decks disponíveis no Anki
   */
  static async getDecks(): Promise<string[]> {
    try {
      // Usar o método request para obter os decks
      const decks = await this.request<Record<string, number>>("deckNames");

      // Converter o objeto de decks para um array de strings (nomes dos decks)
      return Object.keys(decks || {});
    } catch (error) {
      Logger.error("Erro ao obter decks do Anki:", error);
      // Retornar um array vazio em caso de erro
      return [];
    }
  }

  /**
   * Cria um novo deck no Anki
   */
  static async createDeck(deckName: string): Promise<number> {
    try {
      // Verificar se o deck já existe
      const decks = await this.getDecks();
      if (decks.includes(deckName)) {
        Logger.debug(`Deck "${deckName}" já existe, não é necessário criar.`);
        return 1; // Retornar um ID positivo para indicar sucesso
      }

      // Criar o deck
      const deckId = await this.request<number>("createDeck", { deck: deckName });
      Logger.debug(`Deck "${deckName}" criado com sucesso. ID: ${deckId}`);
      return deckId;
    } catch (error) {
      Logger.error(`Erro ao criar deck "${deckName}":`, error);
      throw new Error(
        `Não foi possível criar o deck "${deckName}". Verifique se o Anki está aberto e o AnkiConnect instalado.`,
      );
    }
  }

  /**
   * Obtém a lista de modelos disponíveis no Anki
   */
  static async modelNames(): Promise<string[]> {
    try {
      const models = await this.request<string[]>("modelNames");
      return models || [];
    } catch (error) {
      Logger.error("Erro ao obter nomes dos modelos do Anki:", error);
      return [];
    }
  }

  /**
   * Obtém os nomes dos campos de um modelo do Anki
   */
  static async modelFieldNames(modelName: string): Promise<string[]> {
    try {
      if (!modelName) {
        throw new Error("Nome do modelo não especificado");
      }

      const fields = await this.request<string[]>("modelFieldNames", { modelName });
      return fields || [];
    } catch (error) {
      Logger.error(`Erro ao obter campos do modelo "${modelName}":`, error);
      return [];
    }
  }

  /**
   * Verifica se as notas podem ser adicionadas ao Anki
   */
  static async canAddNotes(notes: AnkiNote[]): Promise<boolean[]> {
    try {
      if (!notes || !Array.isArray(notes) || notes.length === 0) {
        return [];
      }

      const results = await this.request<boolean[]>("canAddNotes", { notes });
      return results || [];
    } catch (error) {
      Logger.error("Erro ao verificar se as notas podem ser adicionadas:", error);
      // Em caso de erro, assumimos que nenhuma nota pode ser adicionada
      return notes.map(() => false);
    }
  }

  /**
   * Adiciona notas ao Anki
   * Retorna um array com os IDs das notas adicionadas ou null para as que falharam
   */
  static async addNotes(notes: AnkiNote[]): Promise<(number | null)[]> {
    try {
      if (!notes || !Array.isArray(notes) || notes.length === 0) {
        return [];
      }

      const results = await this.request<(number | null)[]>("addNotes", { notes });
      return results || [];
    } catch (error) {
      Logger.error("Erro ao adicionar notas ao Anki:", error);
      throw new Error(`Falha ao adicionar notas ao Anki: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verifica se o AnkiConnect está instalado e funcionando corretamente
   */
  static async checkAnkiConnectInstallation(): Promise<{
    installed: boolean;
    version?: number;
    error?: string;
  }> {
    try {
      Logger.debug("Verificando instalação do AnkiConnect");

      // Verificar primeiro se o Anki está rodando
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        return {
          installed: false,
          error: "O Anki não está rodando. Por favor, abra o Anki antes de verificar a instalação do AnkiConnect.",
        };
      }

      // Tentar obter a versão do AnkiConnect
      try {
        const version = await this.request<number>("version");

        // Verificar se a versão é compatível
        if (version < 6) {
          return {
            installed: true,
            version,
            error: `Versão do AnkiConnect (${version}) é menor que a necessária (6). Por favor, atualize o AnkiConnect.`,
          };
        }

        return {
          installed: true,
          version,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          installed: false,
          error: `Falha ao comunicar com AnkiConnect: ${errorMessage}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        installed: false,
        error: `Erro ao verificar instalação do AnkiConnect: ${errorMessage}`,
      };
    }
  }
}
