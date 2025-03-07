import { AnkiNote } from "./ankiTypes";
import axios from "axios";
import { Logger } from "../utils/logger";

const ANKI_CONNECT_URL = "http://localhost:8765";

export class AnkiRepository {
  /**
   * Function to test if AnkiConnect is working correctly
   */
  static async testConnection(): Promise<{ success: boolean; message: string; installed: boolean; error?: string }> {
    try {
      Logger.debug("Testing connection to Anki...");

      // First check if Anki is running
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        Logger.debug("Anki is not running");
        return {
          success: false,
          message: "Anki is not running. Please open Anki and try again.",
          installed: false,
          error: "Anki is not running",
        };
      }

      // Test the connection with a simple version check
      const response = await this.request("version", {}, 6, {
        timeout: 5000,
        retries: 2,
      });

      if (response.error) {
        Logger.error(`Error testing connection: ${response.error}`);
        return {
          success: false,
          message: `Error connecting to Anki: ${response.error}`,
          installed: false,
          error: response.error,
        };
      }

      Logger.debug(`Connection successful, AnkiConnect version: ${response.result}`);
      return {
        success: true,
        message: "Connected to Anki successfully",
        installed: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Error testing connection: ${errorMessage}`);
      return {
        success: false,
        message: `Error connecting to Anki: ${errorMessage}`,
        installed: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if Anki is running
   */
  static async isAnkiRunning(): Promise<boolean> {
    try {
      Logger.debug("Checking if Anki is running...");

      // Try a POST request with a short timeout
      try {
        const response = await axios.post(
          ANKI_CONNECT_URL,
          { action: "version", version: 6 },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 2000, // Increased timeout for better reliability
          },
        );

        // If we get a response, Anki is running
        if (response.status === 200) {
          Logger.debug("Anki is running - received successful response");
          return true;
        }
      } catch (error) {
        // Check specific error codes
        if (error.code === "ECONNREFUSED") {
          Logger.debug("Anki is not running - connection refused");
          return false;
        }

        if (error.code === "ECONNRESET") {
          Logger.debug("Connection reset - trying one more time with longer timeout");
          // Try one more time with a longer timeout
          try {
            const response = await axios.post(
              ANKI_CONNECT_URL,
              { action: "version", version: 6 },
              {
                headers: { "Content-Type": "application/json" },
                timeout: 5000, // Even longer timeout for second attempt
              },
            );

            if (response.status === 200) {
              Logger.debug("Anki is running (second attempt successful)");
              return true;
            }
          } catch (secondError) {
            Logger.debug("Second attempt failed - Anki may be having issues");
            return false;
          }
        }

        // For timeout errors, try one more time
        if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
          Logger.debug("Connection timed out - trying one more time");
          try {
            const response = await axios.post(
              ANKI_CONNECT_URL,
              { action: "version", version: 6 },
              {
                headers: { "Content-Type": "application/json" },
                timeout: 5000,
              },
            );

            if (response.status === 200) {
              Logger.debug("Anki is running (retry after timeout successful)");
              return true;
            }
          } catch (timeoutRetryError) {
            Logger.debug("Second timeout attempt failed - Anki may be having issues");
            return false;
          }
        }

        // For any other error, log it and return false
        Logger.debug(`Anki connection check failed with error: ${error.message}`);
        return false;
      }

      return false;
    } catch (error) {
      Logger.error(`Unexpected error checking if Anki is running: ${error}`);
      return false;
    }
  }

  /**
   * Função de requisição base para o AnkiConnect
   * Inclui retry automático e melhor tratamento de erros de conexão
   */
  private static async request<T>(
    action: string,
    params = {},
    version = 6,
    options: {
      timeout?: number;
      retries?: number;
      delay?: number;
    } = {},
  ): Promise<{
    result?: T;
    error?: string;
  }> {
    const { timeout = 30000, retries = 4, delay = 1000 } = options;
    let lastError: unknown;

    // Tentar até o máximo de retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          "http://localhost:8765",
          {
            action,
            version,
            params,
          },
          {
            timeout,
            transitional: {
              clarifyTimeoutError: true,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          },
        );

        // Verificar se a resposta é válida
        if (response.data && typeof response.data === "object") {
          if (response.data.error) {
            return { error: response.data.error };
          }
          return { result: response.data.result };
        }

        // Se chegou aqui, a resposta não tem o formato esperado
        return { error: "Formato de resposta inválido do AnkiConnect" };
      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Registrar erro com mais detalhes para diagnóstico
        Logger.error(`Error on attempt ${attempt}/${retries} for action ${action}: ${errorMessage}`);

        // Verificar se devemos tentar novamente
        if (attempt < retries) {
          // Esperar um tempo antes de tentar novamente (com backoff exponencial)
          const backoffDelay = delay * Math.pow(1.5, attempt - 1);
          Logger.debug(`Retrying in ${backoffDelay}ms... (attempt ${attempt + 1}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    return { error: `Falha após ${retries} tentativas: ${errorMessage}` };
  }

  /**
   * Obter nomes de modelos disponíveis no Anki
   * Com tratamentos adicionais para garantir que sempre retorne dados válidos
   */
  static async modelNames(): Promise<string[]> {
    try {
      Logger.debug("Solicitando lista de modelos do Anki...");

      // Primeiro verificar se o Anki está em execução
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        Logger.warn("Não foi possível obter modelos porque o Anki não está em execução");
        return [];
      }

      // Tentar obter os modelos com mais timeout e retries
      const response = await this.request<unknown>("modelNames", {}, 6, {
        timeout: 20000, // Aumentado para 20s
        retries: 5, // Aumentado para 5 tentativas
      });

      if (response.error) {
        Logger.error(`Erro ao obter nomes de modelos: ${response.error}`);

        // Tentar recuperar a conexão se for um erro conhecido
        if (
          response.error.includes("ECONNRESET") ||
          response.error.includes("socket hang up") ||
          response.error.includes("timeout")
        ) {
          Logger.debug("Tentando recuperar a conexão antes de buscar modelos novamente...");

          // Pausa curta para estabilizar
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Tentar novamente com configurações mais conservadoras
          const retryResponse = await this.request<unknown>("modelNames", {}, 6, {
            timeout: 30000,
            retries: 3,
            delay: 2000, // Atraso maior entre tentativas
          });

          if (!retryResponse.error && Array.isArray(retryResponse.result)) {
            Logger.debug(`Modelos recuperados após nova tentativa: ${retryResponse.result.length}`);
            return retryResponse.result.filter((item) => typeof item === "string") as string[];
          }
        }

        // Se chegou aqui, falhou novamente ou não era um erro recuperável
        return this.getFallbackModels();
      }

      // Verificar que o resultado é um array
      const result = response.result;
      if (!Array.isArray(result)) {
        Logger.error(`Resposta inesperada ao obter modelos: ${JSON.stringify(result)}`);
        return this.getFallbackModels();
      }

      // Filtrar para garantir que só temos strings
      const models = result.filter((item) => typeof item === "string") as string[];

      // Se não houver nenhum modelo, retornar modelos padrão
      if (models.length === 0) {
        Logger.warn("Nenhum modelo foi retornado pelo Anki, usando modelos padrão");
        return this.getFallbackModels();
      }

      Logger.debug(`${models.length} modelos recuperados do Anki com sucesso`);
      return models;
    } catch (error) {
      Logger.error(`Exceção ao obter nomes de modelos: ${error}`);
      return this.getFallbackModels();
    }
  }

  /**
   * Fornece uma lista mínima de modelos padrão quando não é possível obter do Anki
   */
  private static getFallbackModels(): string[] {
    Logger.debug("Usando lista de modelos padrão");
    return ["Basic", "Basic (and reversed card)", "Cloze", "Raycast Flashcards", "Raycast Basic"];
  }

  /**
   * Obter decks disponíveis no Anki
   */
  static async getDecks(): Promise<string[]> {
    try {
      const response = await this.request<unknown>("deckNames", {}, 6, {
        timeout: 15000,
        retries: 4,
      });

      if (response.error) {
        Logger.error(`Erro ao obter decks: ${response.error}`);
        return [];
      }

      // Verificar que o resultado é um array
      const result = response.result;
      if (!Array.isArray(result)) {
        Logger.error(`Resposta inesperada ao obter decks: ${JSON.stringify(result)}`);
        return [];
      }

      // Filtrar para garantir que só temos strings
      return result.filter((item) => typeof item === "string") as string[];
    } catch (error) {
      Logger.error(`Exceção ao obter decks: ${error}`);
      return [];
    }
  }

  /**
   * Verificar se o Anki está em execução
   * Usa timeout reduzido e backoff para ser mais rápido
   */
  static async isAnkiRunning(): Promise<boolean> {
    try {
      // Tentativa com timeout reduzido para resposta rápida
      const response = await this.request<number>("version", {}, 6, {
        timeout: 5000,
        retries: 2,
        delay: 500,
      });

      return !response.error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cria um modelo personalizado para Raycast Flashcards se não existir
   */
  static async createRaycastFlashcardsModelIfNeeded(): Promise<{
    success?: boolean;
    error?: string;
  }> {
    try {
      Logger.debug("Iniciando verificação do modelo Raycast Flashcards");

      // Primeiro, verificar se o Anki está rodando
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        Logger.warn("Anki não está rodando. Não é possível criar o modelo.");
        return {
          error: "Anki não está rodando. Por favor, abra o Anki e tente novamente.",
        };
      }

      // Verificar se o modelo já existe
      const modelsResponse = await this.request<unknown>("modelNames", {}, 6, {
        retries: 3,
        timeout: 15000,
      });

      if (modelsResponse.error) {
        Logger.error(`Erro ao obter lista de modelos: ${modelsResponse.error}`);
        return { error: `Erro ao verificar modelos: ${modelsResponse.error}` };
      }

      // Garantir que models é um array
      const models = Array.isArray(modelsResponse.result)
        ? modelsResponse.result.filter((m) => typeof m === "string")
        : [];

      Logger.debug(`Modelos disponíveis: ${JSON.stringify(models)}`);

      if (models.includes("Raycast Flashcards")) {
        Logger.debug("Modelo 'Raycast Flashcards' já existe");
        return { success: true };
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
          timeout: 20000,
        },
      );

      if (createModelResponse.error) {
        Logger.error(`Falha ao criar modelo: ${createModelResponse.error}`);
        throw new Error(createModelResponse.error);
      }

      Logger.debug("Modelo 'Raycast Flashcards' criado com sucesso");

      // Verificar se o modelo foi realmente criado
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    } catch (error) {
      Logger.error("Erro ao criar modelo 'Raycast Flashcards':", error);
      return {
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar modelo",
      };
    }
  }

  /**
   * Criar modelo básico para flashcards
   * Este é um modelo mais simples que deve funcionar em qualquer instalação do Anki
   */
  static async createBasicFlashcardsModel(): Promise<boolean> {
    try {
      const modelName = "Raycast Basic";

      // Verificar se o modelo já existe
      const models = await this.modelNames();
      if (Array.isArray(models) && models.includes(modelName)) {
        Logger.debug(`Modelo "${modelName}" já existe.`);
        return true;
      }

      // Criar um modelo básico simples com apenas Frente e Verso
      const response = await this.request<unknown>(
        "createModel",
        {
          modelName,
          inOrderFields: ["Frente", "Verso"],
          css: `.card {
          font-family: arial;
          font-size: 20px;
          text-align: center;
          color: black;
          background-color: white;
        }`,
          cardTemplates: [
            {
              Name: "Card 1",
              Front: "{{Frente}}",
              Back: "{{Frente}}<hr id=answer>{{Verso}}",
            },
          ],
        },
        6,
        {
          timeout: 15000,
          retries: 3,
        },
      );

      if (response.error) {
        throw new Error(`Falha ao criar modelo básico: ${response.error}`);
      }

      Logger.debug(`Modelo básico "${modelName}" criado com sucesso.`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao criar modelo básico: ${errorMsg}`);
      return false;
    }
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
      allowDuplicates?: boolean;
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
      let actualModelName = modelName;
      try {
        Logger.debug(`Verificando modelo "${modelName}"...`);
        const models = await this.modelNames();

        // Verificar explicitamente que models é um array válido
        if (!Array.isArray(models)) {
          throw new Error(`Resposta inválida ao obter modelos. Recebido: ${typeof models}`);
        }

        if (!models.includes(modelName)) {
          if (modelName === "Raycast Flashcards") {
            Logger.debug(`Modelo "${modelName}" não encontrado. Criando modelo padrão...`);
            try {
              const modelResult = await this.createRaycastFlashcardsModelIfNeeded();
              if (modelResult.error) {
                throw new Error(`Erro ao criar modelo padrão: ${modelResult.error}`);
              }
              Logger.debug(`Modelo "${modelName}" criado com sucesso!`);
            } catch (modelError) {
              const errorMsg = modelError instanceof Error ? modelError.message : String(modelError);
              Logger.error(`Erro ao criar modelo "${modelName}": ${errorMsg}`);

              // Tentar criar um modelo mais simples como alternativa
              Logger.warn(`Erro relacionado ao campo 'Front'. Tentando abordagem alternativa...`);
              try {
                const success = await this.createBasicFlashcardsModel();
                if (success) {
                  Logger.debug(`Modelo básico criado com sucesso!`);
                  actualModelName = "Raycast Basic";
                } else {
                  throw new Error(`Não foi possível criar modelo básico`);
                }
              } catch (basicModelError) {
                throw new Error(`Não foi possível criar nenhum modelo: ${basicModelError}`);
              }
            }
          } else if (models.length > 0) {
            // Se o modelo solicitado não existe mas há outros modelos disponíveis,
            // usar o primeiro modelo disponível como fallback
            Logger.warn(`Modelo "${modelName}" não encontrado. Usando o primeiro modelo disponível: "${models[0]}"`);
            actualModelName = models[0];
          } else {
            throw new Error(`Não foi possível encontrar ou criar nenhum modelo válido.`);
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
      let errorCount = 0;

      // Processar cada flashcard em lotes pequenos para evitar sobrecarregar a conexão
      const batchSize = 5; // Reduzido para 5 para menos carga no AnkiConnect
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
            // Verificar se flashcard tem campos essenciais
            if (!flashcard.front || !flashcard.back) {
              Logger.warn(`Flashcard inválido (sem frente ou verso): ${JSON.stringify(flashcard)}`);
              errorCount++;
              continue;
            }

            // Mapear os campos do flashcard para o modelo do Anki
            const fields = await this.mapFlashcardToModelFields(flashcard, actualModelName, options.fields);

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
            let note: AnkiNote = {
              deckName,
              modelName: actualModelName,
              fields,
              tags: [...new Set(tags)], // Remover duplicatas
              options: {
                allowDuplicate: !!options.allowDuplicates,
                duplicateScope: "deck",
              },
            };

            // Processar mídia se existir
            if (flashcard.mediaFiles) {
              note = await this.processFlashcardMedia(flashcard, note);
            }

            notes.push(note);
            processedCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            Logger.warn(`Problema ao processar flashcard #${processedCount + 1}: ${errorMessage}`);
            errorCount++;
            // Continuamos mesmo com erro em um flashcard individual
          }
        }

        // Pausa maior entre lotes para não sobrecarregar o AnkiConnect
        if (batchIndex < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Adicionar as notas ao Anki
      Logger.debug("Adicionando notas ao Anki...");
      const addNotesResponse = await this.request<unknown>(
        "addNotes",
        {
          notes,
        },
        6,
        {
          timeout: 30000,
          retries: 4,
        },
      );

      if (addNotesResponse.error) {
        Logger.error(`Erro ao adicionar notas: ${addNotesResponse.error}`);
        return {
          success: false,
          message: `Erro ao adicionar notas: ${addNotesResponse.error}`,
          details: { error: addNotesResponse.error },
        };
      }

      Logger.debug(`Notas adicionadas com sucesso!`);
      return {
        success: true,
        message: `Flashcards adicionados com sucesso ao deck "${deckName}"`,
        details: {
          processedCount,
          errorCount,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao adicionar flashcards: ${errorMessage}`);
      return {
        success: false,
        message: `Erro ao adicionar flashcards: ${errorMessage}`,
        details: { error: errorMessage },
      };
    }
  }

  /**
   * Verificar detalhadamente o status da conexão com o Anki
   * Retorna informações diagnósticas sobre o estado atual da conexão
   */
  static async getConnectionStatus(): Promise<{
    ankiRunning: boolean;
    ankiConnectAvailable: boolean;
    validVersion?: boolean;
    modelsAvailable?: boolean;
    decksAvailable?: boolean;
    errorDetails?: string;
    message: string;
  }> {
    try {
      // 1. Verificar se o Anki está rodando (com timeout reduzido)
      const versionResponse = await this.request<number>("version", {}, 6, {
        timeout: 3000,
        retries: 2,
        delay: 300,
      });

      if (versionResponse.error) {
        Logger.error(`Erro ao verificar versão do AnkiConnect: ${versionResponse.error}`);

        // Analisar o tipo de erro para dar feedback mais específico
        const errorDetails = versionResponse.error;
        let message = "Não foi possível se conectar ao AnkiConnect.";

        // Verificar erros comuns
        if (errorDetails.includes("ECONNREFUSED")) {
          message += " O Anki não está aberto ou o AnkiConnect não está instalado corretamente.";
        } else if (errorDetails.includes("timeout")) {
          message += " A conexão com o AnkiConnect excedeu o tempo limite.";
        } else if (errorDetails.includes("ECONNRESET") || errorDetails.includes("socket hang up")) {
          message += " A conexão com o AnkiConnect foi reiniciada ou interrompida abruptamente.";
        }

        return {
          ankiRunning: false,
          ankiConnectAvailable: false,
          errorDetails,
          message,
        };
      }

      // Verificar versão mínima do AnkiConnect (deve ser pelo menos 6)
      const version = versionResponse.result;
      const validVersion = typeof version === "number" && version >= 6;

      if (!validVersion) {
        Logger.warn(`Versão do AnkiConnect incompatível: ${version}. Requer versão >= 6.`);
        return {
          ankiRunning: true,
          ankiConnectAvailable: true,
          validVersion: false,
          message: `Versão do AnkiConnect (${version}) incompatível. Requer versão >= 6.`,
        };
      }

      // 2. Verificar se temos acesso aos modelos
      const modelsResponse = await this.request<unknown>("modelNames", {}, 6, {
        timeout: 5000,
        retries: 2,
      });

      const modelsAvailable = !modelsResponse.error && Array.isArray(modelsResponse.result);

      if (!modelsAvailable) {
        Logger.warn(`Erro ao acessar modelos do Anki: ${modelsResponse.error}`);
        return {
          ankiRunning: true,
          ankiConnectAvailable: true,
          validVersion,
          modelsAvailable: false,
          errorDetails: modelsResponse.error,
          message: "AnkiConnect está disponível, mas não foi possível acessar os modelos do Anki.",
        };
      }

      // 3. Verificar se temos acesso aos decks
      const decksResponse = await this.request<unknown>("deckNames", {}, 6, {
        timeout: 5000,
        retries: 2,
      });

      const decksAvailable = !decksResponse.error && Array.isArray(decksResponse.result);

      if (!decksAvailable) {
        Logger.warn(`Erro ao acessar decks do Anki: ${decksResponse.error}`);
        return {
          ankiRunning: true,
          ankiConnectAvailable: true,
          validVersion,
          modelsAvailable,
          decksAvailable: false,
          errorDetails: decksResponse.error,
          message: "AnkiConnect está disponível, mas não foi possível acessar os decks do Anki.",
        };
      }

      // Tudo está funcionando corretamente
      return {
        ankiRunning: true,
        ankiConnectAvailable: true,
        validVersion,
        modelsAvailable,
        decksAvailable,
        message: "Conexão com o Anki estabelecida com sucesso.",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao verificar status da conexão: ${errorMsg}`);

      return {
        ankiRunning: false,
        ankiConnectAvailable: false,
        errorDetails: errorMsg,
        message: `Erro ao verificar conexão com o Anki: ${errorMsg}`,
      };
    }
  }

  /**
   * Verificar se há problemas na conexão e tentar recuperar
   * Útil para diagnósticos e recuperação automática
   */
  static async attemptConnectionRecovery(): Promise<{
    success: boolean;
    message: string;
    diagnosticInfo?: unknown;
  }> {
    try {
      Logger.debug("Iniciando tentativa de recuperação de conexão com o Anki...");

      // Verificar status atual
      const status = await this.getConnectionStatus();

      if (status.ankiRunning && status.ankiConnectAvailable && status.validVersion) {
        Logger.debug("Conexão com o Anki já está funcionando corretamente.");
        return {
          success: true,
          message: "Conexão com o Anki já está funcionando corretamente.",
          diagnosticInfo: status,
        };
      }

      // Se o Anki não está rodando, não podemos fazer nada
      if (!status.ankiRunning) {
        Logger.warn("Anki não está rodando. Abra o Anki e tente novamente.");
        return {
          success: false,
          message: "Anki não está rodando. Abra o Anki e tente novamente.",
          diagnosticInfo: status,
        };
      }

      // O Anki está rodando, mas talvez o AnkiConnect não esteja respondendo bem
      // Tentar "resetar" a conexão fazendo algumas requisições simples

      Logger.debug("Tentando restaurar a conexão com o AnkiConnect...");

      // 1. Tentar uma requisição simples de versão
      await this.request("version", {}, 6, { timeout: 10000, retries: 3 });

      // 2. Fazer uma pausa para permitir que o AnkiConnect se estabilize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3. Verificar status novamente
      const newStatus = await this.getConnectionStatus();

      if (newStatus.ankiRunning && newStatus.ankiConnectAvailable && newStatus.validVersion) {
        Logger.debug("Conexão com o Anki recuperada com sucesso.");
        return {
          success: true,
          message: "Conexão com o Anki recuperada com sucesso.",
          diagnosticInfo: newStatus,
        };
      }

      // Se chegou aqui, a recuperação não foi bem-sucedida
      Logger.error("Não foi possível recuperar a conexão com o Anki.");
      return {
        success: false,
        message: "Não foi possível recuperar a conexão com o Anki. Tente reiniciar o Anki.",
        diagnosticInfo: newStatus,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro durante tentativa de recuperação de conexão: ${errorMsg}`);

      return {
        success: false,
        message: `Erro durante tentativa de recuperação: ${errorMsg}`,
        diagnosticInfo: { error: errorMsg },
      };
    }
  }

  /**
   * Converte flashcards no formato da aplicação para o formato do Anki
   * Mapeia os campos de forma inteligente com base no modelo
   */
  private static async mapFlashcardToModelFields(
    flashcard: FlashcardData,
    modelName: string,
    defaultFields?: Record<string, string>,
  ): Promise<Record<string, string>> {
    try {
      // Obter campos do modelo
      const fieldNamesResponse = await this.request<string[]>("modelFieldNames", { modelName }, 6, {
        timeout: 10000,
        retries: 3,
      });

      if (fieldNamesResponse.error || !Array.isArray(fieldNamesResponse.result)) {
        throw new Error(
          `Erro ao obter campos do modelo "${modelName}": ${fieldNamesResponse.error || "Resposta inválida"}`,
        );
      }

      const modelFields = fieldNamesResponse.result;
      Logger.debug(`Campos do modelo "${modelName}": ${JSON.stringify(modelFields)}`);

      // Verificar se é um modelo Cloze
      const isClozeModel =
        modelName.toLowerCase().includes("cloze") ||
        modelFields.some((field) => field === "Text" || field === "text" || field.toLowerCase().includes("cloze"));

      // Campo para detectar se o flashcard é um cartão Cloze
      const hasClozeContent =
        flashcard.front.includes("{{c") ||
        flashcard.back.includes("{{c") ||
        (flashcard.extra && flashcard.extra.includes("{{c"));

      // Se o modelo for Cloze OU o conteúdo tiver marcações Cloze, vamos processar como Cloze
      if (isClozeModel || hasClozeContent) {
        return this.mapToClozeFields(flashcard, modelFields);
      }

      // Caso contrário, mapear para campos normais
      return this.mapToStandardFields(flashcard, modelFields, defaultFields);
    } catch (error) {
      // Se falhar ao mapear com campos detalhados, tenta uma abordagem mais simples
      Logger.warn(`Erro ao mapear campos detalhados, usando mapeamento básico: ${error}`);
      return this.fallbackFieldMapping(flashcard, modelName);
    }
  }

  /**
   * Mapeamento de fallback para quando a detecção inteligente falha
   */
  private static fallbackFieldMapping(flashcard: FlashcardData, modelName: string): Record<string, string> {
    // Mapeamento básico para alguns modelos conhecidos
    if (modelName === "Raycast Flashcards") {
      return {
        Front: flashcard.front,
        Back: flashcard.back,
        Extra: flashcard.extra || "",
      };
    } else if (modelName === "Raycast Basic") {
      return {
        Frente: flashcard.front,
        Verso: flashcard.back,
      };
    } else if (modelName === "Basic") {
      return {
        Front: flashcard.front,
        Back: flashcard.back,
      };
    } else if (modelName.includes("Cloze")) {
      const text = flashcard.front.includes("{{c") ? flashcard.front : `{{c1::${flashcard.front}}}`;
      return {
        Text: text,
        "Back Extra": flashcard.back,
        Extra: flashcard.extra || "",
      };
    }

    // Fallback genérico
    const result: Record<string, string> = {};
    result[Object.keys(result)[0] || "Front"] = flashcard.front;
    result[Object.keys(result)[1] || "Back"] = flashcard.back;

    return result;
  }

  /**
   * Mapear flashcard para campos no formato Cloze
   */
  private static mapToClozeFields(flashcard: FlashcardData, modelFields: string[]): Record<string, string> {
    const fields: Record<string, string> = {};

    // Encontrar campo para o texto principal
    const textField =
      modelFields.find((f) => f === "Text" || f === "text" || f.toLowerCase().includes("cloze")) ||
      modelFields[0] ||
      "Text";

    // Encontrar campo para extra
    const backField =
      modelFields.find(
        (f) => f === "Back Extra" || f === "back" || f === "extra" || f.toLowerCase().includes("back"),
      ) ||
      modelFields[1] ||
      "Back Extra";

    // Encontrar campo adicional para extra, se existir
    const extraField = modelFields.find(
      (f) => f !== textField && f !== backField && (f === "Extra" || f.toLowerCase().includes("extra")),
    );

    // Verificar se o front já tem formatação de cloze
    const hasClozeFormat = flashcard.front.includes("{{c");

    // Preencher os campos
    fields[textField] = hasClozeFormat ? flashcard.front : `{{c1::${flashcard.front}}}`;

    fields[backField] = flashcard.back;

    if (extraField && flashcard.extra) {
      fields[extraField] = flashcard.extra;
    }

    // Preencher qualquer campo restante
    modelFields.forEach((field) => {
      if (!fields[field]) {
        fields[field] = "";
      }
    });

    return fields;
  }

  /**
   * Mapear flashcard para campos de modelo padrão (não-Cloze)
   */
  private static mapToStandardFields(
    flashcard: FlashcardData,
    modelFields: string[],
    defaultFields?: Record<string, string>,
  ): Record<string, string> {
    const fields: Record<string, string> = {};

    // Se temos mapeamento explícito, usá-lo
    if (defaultFields && Object.keys(defaultFields).length > 0) {
      modelFields.forEach((field) => {
        if (defaultFields[field]) {
          fields[field] = defaultFields[field];
        } else {
          fields[field] = "";
        }
      });
      return fields;
    }

    // Detecção inteligente de campos
    const frontField =
      modelFields.find(
        (f) =>
          f === "Front" ||
          f === "Frente" ||
          f.toLowerCase().includes("front") ||
          f.toLowerCase().includes("frente") ||
          f.toLowerCase().includes("question"),
      ) ||
      modelFields[0] ||
      "Front";

    const backField =
      modelFields.find(
        (f) =>
          f === "Back" ||
          f === "Verso" ||
          f.toLowerCase().includes("back") ||
          f.toLowerCase().includes("verso") ||
          f.toLowerCase().includes("answer"),
      ) ||
      modelFields[1] ||
      "Back";

    const extraField = modelFields.find(
      (f) =>
        f !== frontField &&
        f !== backField &&
        (f === "Extra" || f.toLowerCase().includes("extra") || f.toLowerCase().includes("notes")),
    );

    // Preencher os campos
    fields[frontField] = flashcard.front;
    fields[backField] = flashcard.back;

    if (extraField && flashcard.extra) {
      fields[extraField] = flashcard.extra;
    }

    // Preencher qualquer campo restante
    modelFields.forEach((field) => {
      if (!fields[field]) {
        fields[field] = "";
      }
    });

    return fields;
  }
}
