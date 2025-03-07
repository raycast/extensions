import { AnkiResponse, AnkiNote } from "./ankiTypes";
import axios from "axios";
import { Logger } from "../utils/logger";
import { Flashcard } from "../ai/flashcardGenerator";

// URL padrão do AnkiConnect
const ANKI_CONNECT_URL = "http://localhost:8765";

export class AnkiRepository {
  /**
   * Função de diagnóstico para verificar se o AnkiConnect está funcionando corretamente
   */
  static async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    try {
      Logger.debug("Iniciando teste de conexão com AnkiConnect");

      // Verificar primeiro se o Anki está rodando
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        return {
          success: false,
          message: "O Anki não está aberto. Por favor, abra o Anki antes de tentar exportar flashcards.",
          details: { ankiRunning: false },
        };
      }

      // Teste direto e simples com retentativas
      const maxAttempts = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          Logger.debug(`Tentativa ${attempt}/${maxAttempts} - Enviando requisição de versão para AnkiConnect...`);
          const response = await axios.post(
            ANKI_CONNECT_URL,
            {
              action: "version",
              version: 6,
            },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 15000, // Aumentado para 15 segundos
            },
          );

          Logger.debug(`Resposta recebida: ${JSON.stringify(response.data)}`);
          const data = response.data;

          if (data.error) {
            Logger.debug(`Erro retornado pelo AnkiConnect: ${data.error}`);
            return {
              success: false,
              message: `Erro do AnkiConnect: ${data.error}`,
              details: data,
            };
          }

          const version = data.result as number;
          Logger.debug(`Versão do AnkiConnect: ${version}`);

          if (version < 6) {
            return {
              success: false,
              message: `Versão do AnkiConnect (${version}) é menor que a necessária (6). Por favor, atualize o AnkiConnect.`,
              details: { version },
            };
          }

          // Teste adicional: verificar se conseguimos obter a lista de decks
          // Usamos um sistema de retentativas separado para esta operação
          Logger.debug("Tentando obter lista de decks...");
          let decksSuccess = false;
          let decksResponse = null;

          for (let decksAttempt = 1; decksAttempt <= maxAttempts; decksAttempt++) {
            try {
              Logger.debug(`Tentativa ${decksAttempt}/${maxAttempts} de obter decks...`);
              decksResponse = await this.request<string[]>("deckNames", {}, 6, {
                timeout: 15000,
                retries: 0, // Não usamos retentativas internas, estamos controlando aqui
              });

              if (decksResponse.error) {
                Logger.debug(`Erro ao obter decks: ${decksResponse.error}`);
                lastError = new Error(decksResponse.error);
              } else {
                decksSuccess = true;
                Logger.debug(`Decks obtidos com sucesso: ${decksResponse.result?.length || 0} decks`);
                break; // Saímos do loop se tivermos sucesso
              }
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              Logger.debug(`Erro na tentativa ${decksAttempt} de obter decks: ${lastError.message}`);
            }

            // Se não for a última tentativa, aguardar antes de tentar novamente
            if (decksAttempt < maxAttempts) {
              const waitTime = 2000; // 2 segundos
              Logger.debug(`Aguardando ${waitTime}ms antes da próxima tentativa...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }

          if (!decksSuccess) {
            // Verificar se o erro está relacionado ao AnkiConnect não instalado
            if (lastError?.message.includes("ECONNREFUSED") || lastError?.message.includes("ECONNRESET")) {
              return {
                success: false,
                message:
                  "Não foi possível se conectar ao AnkiConnect. Verifique se o plugin AnkiConnect está instalado no Anki e se o Anki está aberto.",
                details: {
                  ankiRunning: true,
                  version: version,
                  error: lastError?.message,
                  installationInstructions:
                    "Para instalar o AnkiConnect:\n1. Abra o Anki\n2. Vá em Ferramentas > Add-ons > Obter Add-ons\n3. Cole o código 2055492159\n4. Reinicie o Anki após a instalação",
                },
              };
            }

            return {
              success: false,
              message: `Erro ao obter decks do Anki: ${lastError?.message || "Erro desconhecido"}. O AnkiConnect está instalado, mas há problemas de comunicação.`,
              details: {
                ankiRunning: true,
                version: version,
                error: lastError?.message,
              },
            };
          }

          // Create Raycast Flashcards model if needed during connection test
          try {
            Logger.debug("Verificando/criando modelo Raycast Flashcards durante teste de conexão...");
            const modelResponse = await this.createRaycastFlashcardsModelIfNeeded();
            if (modelResponse.error) {
              Logger.warn(`Aviso: Não foi possível criar o modelo Raycast Flashcards: ${modelResponse.error}`);
              // Não falharemos o teste de conexão por isso, apenas logamos o aviso
            } else {
              Logger.debug("Modelo Raycast Flashcards verificado/criado com sucesso durante teste de conexão");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            Logger.warn(`Aviso: Erro ao verificar/criar modelo Raycast Flashcards: ${errorMessage}`);
            // Não falharemos o teste de conexão por isso, apenas logamos o aviso
          }

          return {
            success: true,
            message: "Conexão com o Anki bem-sucedida e AnkiConnect funcionando corretamente.",
            details: {
              ankiRunning: true,
              version: version,
              decksCount: decksResponse?.result ? decksResponse.result.length : 0,
            },
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          Logger.debug(`Erro na tentativa ${attempt}: ${lastError.message}`);

          // Se não for a última tentativa, aguardar antes de tentar novamente
          if (attempt < maxAttempts) {
            const waitTime = 2000; // 2 segundos
            Logger.debug(`Aguardando ${waitTime}ms antes da próxima tentativa...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      // Se chegamos aqui, todas as tentativas falharam
      const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);

      // Verificar se o erro está relacionado ao AnkiConnect não instalado
      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ECONNRESET")) {
        return {
          success: false,
          message:
            "Não foi possível se conectar ao AnkiConnect. Verifique se o plugin AnkiConnect está instalado no Anki e se o Anki está aberto.",
          details: {
            error: errorMessage,
            installationInstructions:
              "Para instalar o AnkiConnect:\n1. Abra o Anki\n2. Vá em Ferramentas > Add-ons > Obter Add-ons\n3. Cole o código 2055492159\n4. Reinicie o Anki após a instalação",
          },
        };
      }

      return {
        success: false,
        message: `Falha na comunicação com AnkiConnect após ${maxAttempts} tentativas: ${errorMessage}. Verifique se o Anki está aberto e o AnkiConnect está instalado.`,
        details: { error: errorMessage },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("Erro geral no teste de conexão:", error);

      return {
        success: false,
        message: `Erro no teste de conexão: ${errorMessage}`,
        details: { error: errorMessage },
      };
    }
  }

  /**
   * Verifica se o processo do Anki está rodando
   * Nota: Esta é uma verificação simples e pode não ser 100% precisa
   */
  static async isAnkiRunning(): Promise<boolean> {
    try {
      Logger.debug("Verificando se o Anki está rodando");

      // Implementando sistema de retentativas
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          Logger.debug(`Tentativa ${attempt}/${maxAttempts} de verificar se o Anki está rodando`);

          const response = await axios.post(
            ANKI_CONNECT_URL,
            {
              action: "version",
              version: 6,
            },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 5000, // Timeout menor para esta verificação simples
            },
          );

          // Se chegamos aqui, a requisição foi bem-sucedida
          Logger.debug(`Anki está rodando: ${response.data.result !== undefined}`);
          return response.data.result !== undefined;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Log mais detalhado para erros de conexão
          if (errorMessage.includes("ECONNRESET") || errorMessage.includes("socket hang up")) {
            Logger.debug(
              `Erro de conexão na verificação do Anki (tentativa ${attempt}/${maxAttempts}): ${errorMessage}`,
            );
          } else {
            Logger.debug(
              `Erro ao verificar se Anki está rodando (tentativa ${attempt}/${maxAttempts}): ${errorMessage}`,
            );
          }

          // Se não for a última tentativa, aguardar antes de tentar novamente
          if (attempt < maxAttempts) {
            const waitTime = 1000; // 1 segundo
            Logger.debug(`Aguardando ${waitTime}ms antes da próxima tentativa...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      // Se chegamos aqui, todas as tentativas falharam
      Logger.debug("Anki não está rodando (todas as tentativas falharam)");
      return false;
    } catch (error) {
      Logger.error(
        `Erro geral ao verificar se Anki está rodando: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Envia uma requisição para o AnkiConnect
   */
  static async request<T = unknown>(
    action: string,
    params: Record<string, unknown> = {},
    version = 6,
    options: { retries?: number; timeout?: number } = {},
  ): Promise<AnkiResponse<T>> {
    const { retries = 4, timeout = 30000 } = options; // Aumentado para 4 retentativas e 30 segundos

    const payload = {
      action,
      version,
      params,
    };

    Logger.ankiRequest(action, params);
    Logger.debug(`Enviando requisição para AnkiConnect: ${action}, timeout: ${timeout}ms, retries: ${retries}`);

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < retries + 1) {
      attempt++;
      Logger.debug(`Tentativa ${attempt}/${retries + 1} para ação: ${action}`);

      try {
        // Verificar se o Anki está rodando antes de fazer a requisição
        // Isso evita tentativas desnecessárias quando o Anki não está aberto
        if (
          attempt === 1 ||
          (lastError && (lastError.message.includes("ECONNRESET") || lastError.message.includes("socket hang up")))
        ) {
          const isRunning = await this.isAnkiRunning();
          if (!isRunning) {
            Logger.warn(`Anki não está rodando. Não é possível executar a ação: ${action}`);
            return {
              result: null,
              error: "Anki não está rodando. Por favor, abra o Anki e tente novamente.",
            };
          }

          // Se houve um ECONNRESET na tentativa anterior, esperar um pouco mais
          // para que o servidor possa se recuperar completamente
          if (attempt > 1 && lastError && lastError.message.includes("ECONNRESET")) {
            const recoveryTime = 3000; // 3 segundos para recuperação do servidor
            Logger.debug(`ECONNRESET detectado. Aguardando ${recoveryTime}ms para recuperação do servidor...`);
            await new Promise((resolve) => setTimeout(resolve, recoveryTime));
          }
        }

        // Usar um timeout progressivo para dar mais tempo em tentativas subsequentes
        const currentTimeout = attempt > 1 ? timeout * Math.min(attempt, 3) : timeout;

        // Adicionar cabeçalho para tentar evitar problemas de conexão
        const response = await axios.post(ANKI_CONNECT_URL, payload, {
          headers: {
            "Content-Type": "application/json",
            Connection: "keep-alive",
          },
          timeout: currentTimeout,
        });

        Logger.debug(
          `Resposta recebida para ${action}: ${JSON.stringify(response.data).substring(0, 200)}${JSON.stringify(response.data).length > 200 ? "..." : ""}`,
        );
        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        // Log mais detalhado para erros de conexão
        if (errorMessage.includes("ECONNRESET") || errorMessage.includes("socket hang up")) {
          Logger.error(
            `Erro de conexão na requisição ao AnkiConnect (tentativa ${attempt}/${retries + 1}): ${errorMessage}. Este erro geralmente ocorre quando a conexão é fechada abruptamente pelo servidor.`,
          );

          // Verificar se o Anki ainda está rodando
          const isStillRunning = await this.isAnkiRunning();
          if (!isStillRunning) {
            Logger.warn(`Anki parece ter sido fechado durante a operação. Ação: ${action}`);
            return {
              result: null,
              error: "Anki foi fechado durante a operação. Por favor, abra o Anki e tente novamente.",
            };
          }
        } else {
          Logger.error(`Erro na requisição ao AnkiConnect (tentativa ${attempt}/${retries + 1}): ${errorMessage}`);
        }

        // Se já tentamos o número máximo de vezes, desistir
        if (attempt >= retries + 1) {
          break;
        }

        // Tempo de espera progressivo entre tentativas com um componente aleatório
        // para evitar que múltiplas requisições tentem ao mesmo tempo
        const baseWaitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Aumentando o tempo base e max
        const jitter = Math.floor(Math.random() * 1000); // Adiciona até 1000ms de variação
        const waitTime = baseWaitTime + jitter;

        Logger.debug(`Aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Mensagem de erro mais detalhada quando todas as tentativas falham
    const errorDetails = lastError?.message || "Erro desconhecido";
    const errorMessage = errorDetails.includes("ECONNRESET")
      ? "Não foi possível conectar ao Anki. Verifique se o Anki está aberto e se o AnkiConnect está instalado corretamente. Reinicie o Anki caso necessário."
      : `Falha após ${retries + 1} tentativas: ${errorDetails}`;

    Logger.debug(`Todas as tentativas falharam para ação: ${action}`);
    return {
      result: null,
      error: errorMessage,
    };
  }

  /**
   * Adiciona uma nota ao Anki
   */
  static async addNote(note: AnkiNote): Promise<AnkiResponse> {
    try {
      Logger.debug("Adicionando nota ao Anki", note);

      // Validação básica dos dados antes de enviar
      if (!note.deckName || !note.modelName || !note.fields) {
        return { error: "Dados da nota incompletos (faltando deckName, modelName ou fields)", result: null };
      }

      // Verificar se algum campo tem conteúdo
      const hasContent = Object.values(note.fields).some(
        (value) => value !== undefined && value !== null && value.trim() !== "",
      );

      if (!hasContent) {
        return { error: "Nenhum campo da nota tem conteúdo", result: null };
      }

      // Para modelo Cloze, verificar se tem campo Text
      if (note.modelName === "Cloze" && !note.fields.Text) {
        return { error: "Modelo Cloze requer campo Text", result: null };
      }

      // Remover campos vazios para evitar problemas no Anki
      const cleanedFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(note.fields)) {
        if (value !== undefined && value !== null && typeof value === "string") {
          cleanedFields[key] = value.trim();
        }
      }
      note.fields = cleanedFields;

      // Limitar tamanho dos campos para evitar problemas de performance
      const MAX_FIELD_LENGTH = 50000; // 50k caracteres
      for (const [key, value] of Object.entries(note.fields)) {
        if (value && value.length > MAX_FIELD_LENGTH) {
          note.fields[key] =
            value.substring(0, MAX_FIELD_LENGTH) + "... (conteúdo truncado devido ao tamanho excessivo)";
        }
      }

      // Certificar que as tags são strings válidas (sem espaços)
      if (note.tags && Array.isArray(note.tags)) {
        note.tags = note.tags
          .filter((tag) => typeof tag === "string" && tag.trim() !== "")
          .map((tag) => tag.trim().replace(/\s+/g, "_"));
      }

      // Log detalhado da nota a ser enviada
      Logger.debug("Enviando nota para o Anki com campos:", {
        deckName: note.deckName,
        modelName: note.modelName,
        fieldsCount: Object.keys(note.fields).length,
        tagsCount: note.tags?.length || 0,
      });

      // Enviar a requisição para o AnkiConnect
      return await this.request("addNote", { note }, 6, {
        retries: 2,
        timeout: 20000, // Aumentar timeout para 20 segundos para lidar com decks grandes
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao adicionar nota ao Anki: ${errorMessage}`, error);

      return {
        error: `Erro ao adicionar nota: ${errorMessage}`,
        result: null,
      };
    }
  }

  /**
   * Mapeia os campos do flashcard para o modelo do Anki selecionado
   */
  static async mapFlashcardToModelFields(
    flashcard: Flashcard | Record<string, string>,
    modelName: string,
  ): Promise<Record<string, string>> {
    try {
      // Obter os campos do modelo
      const fieldsResponse = await this.modelFieldNames(modelName);
      if (fieldsResponse.error || !fieldsResponse.result) {
        throw new Error(`Erro ao obter campos do modelo: ${fieldsResponse.error}`);
      }

      const modelFields = fieldsResponse.result as string[];
      Logger.debug(`Campos do modelo ${modelName}:`, modelFields);
      const mappedFields: Record<string, string> = {};

      // Mapeamento padrão para modelos comuns
      const defaultMappings: Record<string, Record<string, string>> = {
        Basic: {
          Front: "front",
          Back: "back",
        },
        Básico: {
          Frente: "front",
          Verso: "back",
        },
        "Basic (and reversed card)": {
          Front: "front",
          Back: "back",
        },
        "Básico (e card invertido)": {
          Frente: "front",
          Verso: "back",
        },
        "Basic (optional reversed card)": {
          Front: "front",
          Back: "back",
        },
        "Básico (card invertido opcional)": {
          Frente: "front",
          Verso: "back",
        },
        "Basic (type in the answer)": {
          Front: "front",
          Back: "back",
        },
        "Básico (digite a resposta)": {
          Frente: "front",
          Verso: "back",
        },
        Cloze: {
          Text: "front",
          "Back Extra": "back",
        },
        Omissão: {
          Texto: "front",
          "Verso Extra": "back",
        },
        "Raycast Flashcards": {
          Front: "front",
          Back: "back",
          Extra: "extra",
        },
      };

      // Tentar usar mapeamento padrão primeiro
      const defaultMapping = defaultMappings[modelName];

      // Log para debug
      Logger.debug(`Mapeando campos para modelo ${modelName}`);
      Logger.debug(`Campos disponíveis:`, modelFields);
      Logger.debug(`Mapeamento padrão:`, defaultMapping);

      for (const field of modelFields) {
        // Definir fieldLower no escopo correto para cada campo
        const fieldLower = field.toLowerCase();

        if (defaultMapping && defaultMapping[field]) {
          // Usar mapeamento padrão
          const flashcardField = defaultMapping[field];

          // Verificar se o campo existe no flashcard usando uma abordagem segura de tipos
          if (flashcardField === "front" && "front" in flashcard) {
            mappedFields[field] = flashcard.front || "";
          } else if (flashcardField === "back" && "back" in flashcard) {
            mappedFields[field] = flashcard.back || "";
          } else if (flashcardField === "extra" && "extra" in flashcard) {
            mappedFields[field] = (flashcard as Flashcard).extra || "";
          } else {
            mappedFields[field] = "";
          }

          Logger.debug(`Campo ${field} mapeado para ${flashcardField}: "${mappedFields[field]}"`);
        } else {
          // Tentar mapear campos automaticamente
          if (
            fieldLower.includes("front") ||
            fieldLower.includes("frente") ||
            fieldLower.includes("question") ||
            fieldLower.includes("pergunta")
          ) {
            mappedFields[field] = "front" in flashcard ? flashcard.front : "";
          } else if (
            fieldLower.includes("back") ||
            fieldLower.includes("verso") ||
            fieldLower.includes("answer") ||
            fieldLower.includes("resposta")
          ) {
            mappedFields[field] = "back" in flashcard ? flashcard.back : "";
          } else if (fieldLower.includes("extra") || fieldLower.includes("note") || fieldLower.includes("nota")) {
            mappedFields[field] = "extra" in flashcard ? (flashcard as Flashcard).extra || "" : "";
          } else {
            // Campo desconhecido, deixar vazio
            mappedFields[field] = "";
          }
          Logger.debug(`Campo ${field} mapeado automaticamente: "${mappedFields[field]}"`);
        }

        // Garantir que o campo não está vazio se for obrigatório
        if (mappedFields[field].trim() === "") {
          Logger.debug(`Campo ${field} está vazio, tentando encontrar conteúdo alternativo`);
          // Tentar usar o campo extra se front/back estiver vazio
          if (
            (fieldLower.includes("front") || fieldLower.includes("frente")) &&
            "extra" in flashcard &&
            flashcard.extra
          ) {
            mappedFields[field] =
              "front" in flashcard && flashcard.front ? flashcard.front : (flashcard as Flashcard).extra || "";
          } else if (
            (fieldLower.includes("back") || fieldLower.includes("verso")) &&
            "extra" in flashcard &&
            flashcard.extra
          ) {
            mappedFields[field] =
              "back" in flashcard && flashcard.back ? flashcard.back : (flashcard as Flashcard).extra || "";
          }
        }
      }

      // Validação final
      const emptyFields = Object.entries(mappedFields)
        .filter(([, value]) => !value || value.trim() === "")
        .map(([field]) => field);

      if (emptyFields.length > 0) {
        Logger.warn(`Campos vazios encontrados: ${emptyFields.join(", ")}`);
        throw new Error(`Os seguintes campos estão vazios: ${emptyFields.join(", ")}`);
      }

      return mappedFields;
    } catch (error) {
      Logger.error(`Erro ao mapear campos do flashcard: ${error}`);
      throw error;
    }
  }

  /**
   * Adiciona flashcards ao Anki
   */
  static async addFlashcards(
    flashcards: Flashcard[] | Record<string, string>[],
    deckName: string,
    modelName: string,
    tags: string[] = [],
  ): Promise<AnkiResponse> {
    try {
      if (!flashcards || flashcards.length === 0) {
        return { error: "Nenhum flashcard para adicionar", result: null };
      }

      // Criar o deck se não existir
      await this.createDeck(deckName);

      // Converter flashcards para notas do Anki
      const notes: AnkiNote[] = [];
      const errors: string[] = [];

      for (const flashcard of flashcards) {
        try {
          const fields = await this.mapFlashcardToModelFields(flashcard, modelName);

          notes.push({
            deckName,
            modelName,
            fields,
            tags: [...tags, ...(flashcard.tags || [])],
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Erro ao processar flashcard: ${errorMessage}`);
          Logger.error(`Erro ao mapear flashcard para nota do Anki:`, {
            error: errorMessage,
            flashcard,
            modelName,
          });
        }
      }

      if (notes.length === 0) {
        const errorMessage =
          errors.length > 0
            ? `Nenhum flashcard pôde ser convertido:\n${errors.join("\n")}`
            : "Nenhum flashcard pôde ser convertido para o formato do Anki";
        return { error: errorMessage, result: null };
      }

      // Verificar se as notas podem ser adicionadas
      const canAddResponse = await this.canAddNotes(notes);
      if (canAddResponse.error) {
        return {
          error: `Erro ao verificar notas: ${canAddResponse.error}`,
          result: null,
        };
      }

      const canAdd = canAddResponse.result as boolean[];
      const invalidNotes = canAdd.filter((can) => !can).length;

      if (invalidNotes > 0) {
        Logger.warn(`${invalidNotes} notas não podem ser adicionadas ao Anki`);
        // Filtrar apenas as notas que podem ser adicionadas
        notes.forEach((note, index) => {
          if (!canAdd[index]) {
            errors.push(`Nota ${index + 1} é inválida para o modelo "${modelName}"`);
          }
        });
      }

      // Adicionar as notas ao Anki
      const addResponse = await this.addNotes(notes);

      if (addResponse.error) {
        return {
          error: `Erro ao adicionar notas: ${addResponse.error}\n${errors.join("\n")}`,
          result: addResponse.result,
        };
      }

      const addedNotes = (addResponse.result as (number | null)[]).filter((id) => id !== null).length;
      const failedNotes = notes.length - addedNotes;

      if (failedNotes > 0) {
        return {
          error: `${failedNotes} flashcards não puderam ser adicionados.\n${errors.join("\n")}`,
          result: addResponse.result,
        };
      }

      return {
        result: addResponse.result,
        error: errors.length > 0 ? errors.join("\n") : null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Erro ao adicionar flashcards ao Anki: ${errorMessage}`);
      return { error: errorMessage, result: null };
    }
  }

  static async getDecks(): Promise<AnkiResponse> {
    return this.request("deckNames");
  }

  static async createDeck(deckName: string): Promise<AnkiResponse> {
    if (!deckName || typeof deckName !== "string" || deckName.trim() === "") {
      return { error: "Nome do deck inválido", result: null };
    }

    return this.request("createDeck", { deck: deckName });
  }

  static async modelNames(): Promise<AnkiResponse> {
    return this.request("modelNames");
  }

  static async modelFieldNames(modelName: string): Promise<AnkiResponse> {
    if (!modelName || typeof modelName !== "string") {
      return { error: "Nome do modelo inválido", result: null };
    }

    return this.request("modelFieldNames", { modelName });
  }

  static async canAddNotes(notes: AnkiNote[]): Promise<AnkiResponse> {
    // Formatar as notas para o formato esperado pelo AnkiConnect
    const formattedNotes = notes.map((note) => ({
      deckName: note.deckName,
      modelName: note.modelName,
      fields: note.fields,
      tags: note.tags || [],
    }));

    return this.request("canAddNotes", { notes: formattedNotes });
  }

  /**
   * Adiciona múltiplas notas ao Anki
   */
  static async addNotes(notes: AnkiNote[]): Promise<AnkiResponse> {
    try {
      Logger.debug(`Adicionando ${notes.length} notas ao Anki`);

      // Verificar se o Anki está rodando
      const isRunning = await this.isAnkiRunning();
      if (!isRunning) {
        Logger.error("Anki não está rodando. Não é possível adicionar notas.");
        return {
          result: null,
          error: "O Anki não está aberto. Por favor, abra o Anki antes de tentar exportar flashcards.",
        };
      }

      // Verificar se o modelo existe antes de tentar adicionar notas
      const modelsResponse = await this.request("modelNames", {}, 6, {
        retries: 2,
        timeout: 10000, // Aumentado para 10 segundos
      });

      if (modelsResponse.error) {
        Logger.error(`Erro ao verificar modelos disponíveis: ${modelsResponse.error}`);
        return {
          result: null,
          error: `Erro ao verificar modelos disponíveis: ${modelsResponse.error}`,
        };
      }

      const models = modelsResponse.result as string[];

      // Verificar se todos os modelos usados nas notas existem
      const modelNames = new Set(notes.map((note) => note.modelName));
      for (const modelName of modelNames) {
        if (!models.includes(modelName)) {
          Logger.error(`Modelo "${modelName}" não existe. Tentando criar modelo Raycast Flashcards...`);

          // Se for o modelo Raycast Flashcards, tente criá-lo
          if (modelName === "Raycast Flashcards") {
            const createModelResponse = await this.createRaycastFlashcardsModelIfNeeded();
            if (createModelResponse.error) {
              Logger.error(`Falha ao criar modelo Raycast Flashcards: ${createModelResponse.error}`);
              return {
                result: null,
                error: `O modelo "${modelName}" não existe e não foi possível criá-lo. Erro: ${createModelResponse.error}`,
              };
            }
            Logger.debug("Modelo Raycast Flashcards criado com sucesso");
          } else {
            return {
              result: null,
              error: `O modelo "${modelName}" não existe no Anki. Por favor, crie o modelo primeiro.`,
            };
          }
        }
      }

      // Adicionar um pequeno atraso para garantir que o modelo foi criado
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Adicionar as notas com mais retentativas e timeout maior
      const response = await this.request("addNotes", { notes }, 6, {
        retries: 3,
        timeout: 30000, // Aumentar timeout para 30 segundos
      });

      if (response.error) {
        Logger.error(`Erro ao adicionar notas: ${response.error}`);
        return response;
      }

      // Verificar se todas as notas foram adicionadas
      const addedIds = response.result as (number | null)[];
      const addedCount = addedIds.filter((id) => id !== null).length;

      Logger.debug(`${addedCount} de ${notes.length} notas adicionadas com sucesso`);

      if (addedCount < notes.length) {
        Logger.warn(`Algumas notas (${notes.length - addedCount}) não puderam ser adicionadas`);

        // Tentar identificar quais notas falharam
        const failedNotes = addedIds
          .map((id, index) => ({ id, index }))
          .filter((item) => item.id === null)
          .map((item) => notes[item.index]);

        if (failedNotes.length > 0) {
          Logger.debug(
            `Notas que falharam: ${JSON.stringify(failedNotes.map((n) => ({ deckName: n.deckName, fields: n.fields })))}`,
          );
        }
      }

      return response;
    } catch (error) {
      Logger.error("Erro ao adicionar notas:", error);
      return {
        result: null,
        error: error instanceof Error ? error.message : "Erro desconhecido ao adicionar notas",
      };
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
        const versionResponse = await this.request("version", {}, 6, {
          retries: 1,
          timeout: 5000,
        });

        if (versionResponse.error) {
          return {
            installed: false,
            error: `Erro ao verificar versão do AnkiConnect: ${versionResponse.error}`,
          };
        }

        const version = versionResponse.result as number;

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

  /**
   * Obtém todas as tags existentes no Anki
   */
  static async getTags(): Promise<AnkiResponse<string[]>> {
    return this.request("getTags");
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
}
